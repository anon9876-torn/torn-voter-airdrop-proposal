// import "@nomiclabs/hardhat-waffle";
import { Contract } from "@ethersproject/contracts";
import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { getSignerFromAddress, advanceTime } from "./helpers";
import governanceAbi from "../abi/governance.json";
import voterAirdropAbi from "../abi/voterairdrop.json";
import * as Torn from "../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json";
import { BigNumber } from "@ethersproject/bignumber";

describe("TCashProposal", function () {
  // Live TORN contract
  const tornToken = "0x77777FeDdddFfC19Ff86DB637967013e6C6A116C";
  // Live governance contract
  const governanceAddress = "0x5efda50f22d34F262c29268506C5Fa42cB56A1Ce";
  // Live voter airdrop contract
  const voterAirdropContract = "0x2Aa1953bc1213935Eb3ceEF04DE00428C6C7B808";
  // TORN whale to vote with 25k votes to pass the vote
  const tornWhaleAddress = "0x5f48c2a71b2cc96e3f0ccae4e39318ff0dc375b2";

  const torn25k = ethers.utils.parseEther("25000");
  const secondPerYear = 30 * 12 * 24 * 3600;

  let voterAirdrop: Contract;
  let proposal: Contract;
  let torn: Contract;
  let snapshotId: string;

  let sendr = async (method, params) => {
    return await ethers.provider.send(method, params);
  }

  it("Proposal should work", async function () {
    // === deploy and pass proposal  ===

    let voterAirdrop = await ethers.getContractAt(voterAirdropAbi, voterAirdropContract);

    console.log("voterAirdrop address", voterAirdrop.address);

    const Proposal = await ethers.getContractFactory("TCashProposal");
    proposal = await Proposal.deploy();
    await proposal.deployed();

    // Get Tornado governance contract
    let governance = await ethers.getContractAt(governanceAbi, governanceAddress);

    // Get TORN token contract
    torn = await ethers.getContractAt(Torn.abi, tornToken);

    // Impersonate a TORN address with more than 25k tokens
    await sendr("hardhat_impersonateAccount", ["0xA2b2fBCaC668d86265C45f62dA80aAf3Fd1dEde3"]);
    const tornWhaleSigner = await ethers.getSigner("0xA2b2fBCaC668d86265C45f62dA80aAf3Fd1dEde3");
    torn = await torn.connect(tornWhaleSigner);
    governance = await governance.connect(tornWhaleSigner);

    // Lock 25k TORN in governance
    await torn.approve(governance.address, torn25k);
    await governance.lockWithApproval(torn25k);

    // Propose
    await governance.propose(proposal.address, "Airdrop tokens to voters");
    const proposalId = await governance.proposalCount();

    // Wait the voting delay and vote for the proposal
    await advanceTime((await governance.VOTING_DELAY()).toNumber() + 1);
    await governance.castVote(proposalId, true);

    console.log("Advanced time and cast votes");

    // Wait voting period + execution delay
    await advanceTime(
      (await governance.VOTING_PERIOD()).toNumber() + (await governance.EXECUTION_DELAY()).toNumber()
    );

    console.log("proposal address", proposal.address);
    console.log("Getting first balance of voter airdrop contract", voterAirdrop.address);

    let airdropBalance = await torn.balanceOf(voterAirdrop.address);
    expect(airdropBalance).eq('0');

    console.log(`Airdrop Contract balance before proposal: ${airdropBalance} TORN`);

    // Execute the proposal
    let pending = await governance.execute(proposalId);
    let receipt = await pending.wait();

    // === Verify proposal ===
    airdropBalance = await torn.balanceOf(voterAirdrop.address);

    expect(airdropBalance).eq('50000106000000000000000');

    console.log(`Airdrop Contract balance after proposal: ${airdropBalance} TORN`);

    const voterAddress = "0x33A316107f71909b7d638F7dd40713c8bbE2D684";
    await sendr("hardhat_impersonateAccount", [voterAddress]);
    const voterSigner = await ethers.getSigner(voterAddress);
    voterAirdrop = await voterAirdrop.connect(voterSigner);

    await sendr("hardhat_setBalance", [
      voterAddress,
      "0x10000000000000000000000000",
    ]);

    let voterAddressBalance = await torn.balanceOf(voterAddress);

    expect(voterAddressBalance).eq('0');

    console.log(`Voter balance before claim: ${voterAddressBalance} TORN`);

    pending = await voterAirdrop.claim();
    receipt = await pending.wait();

    voterAddressBalance = await torn.balanceOf(voterAddress);
    expect(voterAddressBalance).eq('161276946783779550000');
    console.log(`Voter balance after claim: ${voterAddressBalance} TORN`);

    // Can't claim twice
    pending = await voterAirdrop.claim();
    receipt = await pending.wait();

    voterAddressBalance = await torn.balanceOf(voterAddress);
    expect(voterAddressBalance).eq('161276946783779550000');
    console.log(`Voter balance after second claim: ${voterAddressBalance} TORN`);

    airdropBalance = await torn.balanceOf(voterAirdrop.address);
    expect(airdropBalance).eq('49838829053216220450000');
    console.log(`Airdrop Contract balance after claim: ${airdropBalance} TORN`);

  }).timeout(50000);
});
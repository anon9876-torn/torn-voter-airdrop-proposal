## Tornado cash Proposal #9: Airdrop to TORN Governance Voters

```
npm install --dev
```

You need to configure: 

```
ETH_RPC_MAINNET=<Ethereum node>
```

Run the test:

```
npx hardhat --network hardhat test
```

## Why 2 contracts?

We must use 2 contracts as `delegateCall` makes transferring TORN directly to the proposal contract very tricky, would have to precalculate the deployed address. For safety, we deploy `voterairdrop.sol` first and then hardcode its address into `proposal.sol`.

## Recreate the airdrop allocations

Modify `createVoterBalances.js` to change `infuraProjectId` from `REPLACE_ME` to a project ID created at [infura](https://infura.io/). Then:

`node createVotersBalances.js`

It will create `voterAllocations.sol` (used for `voterairdrop.sol` constructor) and `voterData.json` (used as a reference).

## Unit tests

If you don't want to run yourself, the test:

- Deploys the voter airdrop contract and the proposal
- Proposes, votes, executes the proposal
- Verifies the proper TORN moved to the airdrop contract
- Claims some TORN and verifies it
- Tries to claim twice and receives nothing

Output:

```
  TCashProposal
voterAirdrop address 0xCD8a1C3ba11CF5ECfa6267617243239504a98d90
Advanced time and cast votes
proposal address 0x82e01223d51Eb87e16A03E24687EDF0F294da6f1
Getting first balance of voter airdrop contract 0xCD8a1C3ba11CF5ECfa6267617243239504a98d90
Airdrop Contract balance before proposal: 0 TORN
Airdrop Contract balance after proposal: 50000106000000000000000 TORN
Voter balance before claim: 0 TORN
Voter balance after claim: 161276946783779550000 TORN
Voter balance after second claim: 161276946783779550000 TORN
Airdrop Contract balance after claim: 49838829053216220450000 TORN
    ✓ Proposal should work (4502ms)


  1 passing (5s)
```

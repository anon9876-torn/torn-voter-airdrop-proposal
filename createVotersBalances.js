/* Output a JSON file container the address of the voter and the total votes they
contributed to successfully passed votes */

const fs = require('fs');
const ethers = require('ethers');

const governanceAddress = '0x5efda50f22d34f262c29268506c5fa42cb56a1ce';
const infuraProjectId = 'REPLACE_ME';
const totalAwardedTorn = 50000.0;

let governanceAbiRaw = fs.readFileSync('./abi/governance.json');
let governanceAbi = JSON.parse(governanceAbiRaw);

const provider = new ethers.providers.InfuraProvider(null, infuraProjectId);

const covernanceContract = new ethers.Contract(governanceAddress, governanceAbi, provider);

async function queryContract(eventName, fromBlock, toBlock) {
    let events = await covernanceContract.queryFilter(eventName, fromBlock, toBlock);
    //console.log(events);
    return events;
}

async function createVoterJson() {
    let voteEvents = await queryContract("Voted", 11763923);
    let voterMap = {};
    let totalVotes = ethers.BigNumber.from(0)
    for (let ev of voteEvents) {
        //console.log("Voter", ev.args.voter);
        if (!voterMap[ev.args.voter]) {
            voterMap[ev.args.voter] = { rawVotes: ethers.BigNumber.from(0) };
        }
        voterMap[ev.args.voter].rawVotes = voterMap[ev.args.voter].rawVotes.add(ev.args.votes);
        totalVotes = totalVotes.add(ev.args.votes);
    }

    let totalVotesString = totalVotes.toString();
    let sumAwardedTorn = 0.0;
    let solidityAllocations = '';
    const totalVotesFloat = parseFloat(totalVotesString.substring(0, totalVotesString.length - 18) + '.' + totalVotesString.substring(totalVotesString.length - 18, totalVotesString.length - 13));
    for (let key in voterMap) {
        let rawVotes = voterMap[key].rawVotes.toString();
        voterMap[key].votesDecimal = rawVotes.substring(0, rawVotes.length - 18) + '.' + rawVotes.substring(rawVotes.length - 18);
        voterMap[key].votesFloat = parseFloat(rawVotes.substring(0, rawVotes.length - 18) + '.' + rawVotes.substring(rawVotes.length - 18, rawVotes.length - 13));
        voterMap[key].percentTotal = voterMap[key].votesFloat / totalVotesFloat;
        voterMap[key].tornAwardedFloat = voterMap[key].percentTotal * totalAwardedTorn;
        let torn = voterMap[key].tornAwardedFloat.toString().split('.');
        if (torn[0] === '0') {
            // If less than zero, must strip away all leading zeroes
            voterMap[key].tornAwardedERC20 = (torn[1] + "0".repeat(18 - torn[1].length)).replace(/^0+/, '');
        } else {
            voterMap[key].tornAwardedERC20 = torn[0] + torn[1] + "0".repeat(18 - torn[1].length);
        }
        sumAwardedTorn += voterMap[key].tornAwardedFloat;
        delete voterMap[key].rawVotes;

        solidityAllocations += `allocations[${key}] = ${voterMap[key].tornAwardedERC20};\n`
    }
    //console.log("VoterMap", voterMap);
    console.log("totalVotesRaw", totalVotes);
    console.log("totalVotesString", totalVotesString);
    console.log("totalVotesFloat", totalVotesFloat);
    console.log("sumAwardedTorn", sumAwardedTorn);
    fs.writeFileSync('voterData.json', JSON.stringify(voterMap, null, 4));
    fs.writeFileSync('voterAllocations.sol', solidityAllocations);
}

let voteEvents = createVoterJson();

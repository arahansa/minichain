import { Block, BlockHeader, blockHash } from "./block";
import { bufferToHex } from "./buffer";
import { blockMerkleRoot } from "./merkle";
import {CoinbaseTx, isNormalTx, Tx} from "./tx";
import { Script } from "./types";

const BLOCK_REWARD = 50;

// 돈을 줄 때도 scripts로 받는다
//
export function createNewBlock(txOutScript: Script, txs: Tx[] = [], prevHash = Buffer.alloc(0)): Block {
    // FIXME: Add the mining fee to the coinbase transaction.
    for (tx of txs) {
        if (isNormalTx(tx)) {
            for(output of tx.outputs){
                output.value = output.value * 0.99;
                BLOCK_REWARD += output.value * 0.01;
            }
        }
    }
    const reward = new CoinbaseTx([{
        value: BLOCK_REWARD,
        txOutScript
    }]);
    txs = [reward].concat(txs);

    const header: BlockHeader = {
        nounce: 0,
        prevHash,
        merkleRoot: blockMerkleRoot(txs),
        timestamp: new Date()
    };

    let hash: Buffer;
    do {
        hash = blockHash(header);
        header.nounce++;
    } while (!isValidBlockHash(hash));

    console.log(`Mined block ${bufferToHex(hash)}`);
    return { header, txs };
}

function isValidBlockHash(hash: Buffer): boolean {
    const hashStr = bufferToHex(hash);
    return hashStr.startsWith("0x0000");
}

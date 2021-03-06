import { MAX_MONEY, moneyRange } from "./amount";
import { Block } from "./block";
import { CoinsView, updateCoins } from "./coins";
import { blockMerkleRoot } from "./merkle";
import { Tx, isCoinbaseTx, isNormalTx } from "./tx";
import { verifyTx } from "./txVerify";
import {TxInput} from "./types";

export function connectBlock(block: Block, inputs: CoinsView): boolean {
    const cache = new CoinsView(inputs);

    if (!checkBlock(block))
        return false;

    for (const tx of block.txs) {
        if (!verifyTx(tx, cache))
            return false;

        updateCoins(tx, cache);
    }

    cache.flush();
    return true;
}

export function checkBlock(block: Block): boolean {
    // Verify Merkle hash
    if (!blockMerkleRoot(block.txs).equals(block.header.merkleRoot))
        return false;

    // First transaction must be coinbase, the rest must not be
    if (block.txs.length === 0 || !isCoinbaseTx(block.txs[0])) {
        console.log("bad-cb-missing");
        return false;
    }

    // Block has more than one reward transaction.
    for (const tx of block.txs.slice(1)) {
        if (isCoinbaseTx(tx)) {
            console.log("bad-cb-multiple");
            return false;
        }
    }

    for (const tx of block.txs) {
        if (!checkTx(tx))
            return false;
    }

    return true;
}

export function checkTx(tx: Tx): boolean {
    if (isNormalTx(tx) && tx.inputs.length === 0) {
        console.log("bad-txns-inputs-empty");
        return false;
    }
    if (tx.outputs.length === 0) {
        console.log("bad-txns-outputs-empty");
        return false;
    }

    let valueOut = 0;
    for (const output of tx.outputs) {
        if (output.value < 0) {
            console.log("bad-txns-out-negative");
            return false;
        }
        if (output.value > MAX_MONEY) {
            console.log("bad-txns-out-toolarge");
            return false;
        }
        valueOut += output.value;
        if (!moneyRange(valueOut)) {
            console.log("bad-txns-txouttotal-toolarge");
            return false;
        }
    }

    // inputs 에서 ScriptSig가 중복된 것을 찾아보자
    if(isNormalTx(tx) && hasDuplicates(tx.inputs())){
        console.log("bad-txns-duplicate");
        return false;
    }

    return true;
}

// https://stackoverflow.com/questions/7376598/in-javascript-how-do-i-check-if-an-array-has-duplicate-values
function hasDuplicates(_inputs: TxInput[]) {
    var valuesSoFar = Object.create(null);
    for (var i = 0; i < array.length; ++i) {
        var value = array[i].ScriptSig;
        if (value in valuesSoFar) {
            return true;
        }
        valuesSoFar[value] = true;
    }
    return false;
}



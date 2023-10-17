import { Blockchain, SandboxContract, printTransactionFees } from '@ton-community/sandbox';
import '@ton-community/test-utils';
import { toNano } from 'ton-core';
import { Task1 } from '../wrappers/Task1';

describe('Task1', () => {
    let blockchain: Blockchain;
    let task1: SandboxContract<Task1>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        task1 = blockchain.openContract(await Task1.fromInit());
        const deployer = await blockchain.treasury('deployer');
        const deployResult = await task1.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: task1.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and tactCounter are ready to use
    });

    it('should Add', async () => {
        const counterBefore = await task1.getCounter();
        const increaser = await blockchain.treasury('increaser');
        console.log('counter before increasing', counterBefore);
        const increaseBy = BigInt(Math.floor(Math.random() * 100));
        console.log('increasing by', increaseBy);
        const increaseResult = await task1.send(
            increaser.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Add',
                queryId: 0n,
                number: increaseBy,
            }
        );
        expect(increaseResult.transactions).toHaveTransaction({
            from: increaser.address,
            to: task1.address,
            success: true,
        });
        const counterAfter = await task1.getCounter();

        console.log('counter after increasing', counterAfter);

        expect(counterAfter).toBe(counterBefore + increaseBy);

        console.log(printTransactionFees(increaseResult.transactions));
    });

    it('should Subtract', async () => {
        const counterBefore = await task1.getCounter();
        const increaser = await blockchain.treasury('increaser');
        console.log('counter before increasing', counterBefore);
        const increaseBy = BigInt(Math.floor(Math.random() * 100));
        console.log('increasing by', increaseBy);
        const increaseResult = await task1.send(
            increaser.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Subtract',
                queryId: 0n,
                number: increaseBy,
            }
        );
        expect(increaseResult.transactions).toHaveTransaction({
            from: increaser.address,
            to: task1.address,
            success: true,
        });
        const counterAfter = await task1.getCounter();

        console.log('counter after increasing', counterAfter);

        expect(counterAfter).toBe(counterBefore - increaseBy);
    });
});

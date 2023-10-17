import { Blockchain, SandboxContract, printTransactionFees, TreasuryContract } from '@ton-community/sandbox';
import '@ton-community/test-utils';
import { toNano, Address, beginCell } from 'ton-core';
import { Task2 } from '../wrappers/Task2';

describe('Task2', () => {
    let blockchain: Blockchain;
    let task2: SandboxContract<Task2>;
    let deployer: SandboxContract<TreasuryContract>;
    let sender: SandboxContract<TreasuryContract>;

    it('should deploy', async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        sender = await blockchain.treasury('sender');

        task2 = blockchain.openContract(await Task2.fromInit(
            deployer.address as Address
        ));

        const deployResult = await task2.send(
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
            to: task2.address,
            deploy: true,
            success: true,
        });

        console.log('contract address', task2.address);
        console.log('deployer (admin) address', deployer.address);
        console.log('sender address', sender.address);
    });

    it('should Refund', async () => {
        const refundResult = await task2.send(
            deployer.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'Refund',
                queryId: 0n,
                sender: sender.address,
            }
        );

        expect(refundResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: task2.address,
            success: true,
        });

        expect(refundResult.transactions).toHaveTransaction({
            from: task2.address,
            to: sender.address,
            success: true,
        });

        printTransactionFees(refundResult.transactions)
    });

    it('should Refund Error', async () => {
        const refundResult = await task2.send(
            sender.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'Refund',
                queryId: 0n,
                sender: deployer.address,
            }
        );

        printTransactionFees(refundResult.transactions)

        expect(refundResult.transactions).toHaveTransaction({
            from: sender.address,
            to: task2.address,
            success: true,
        });
    });

    it('should Proxy', async () => {
        const refundResult = await task2.send(
            sender.getSender(),
            {
                value: toNano('0.03'),
            },
            beginCell().endCell().beginParse()
        );

        printTransactionFees(refundResult.transactions)

        expect(refundResult.transactions).toHaveTransaction({
            from: sender.address,
            to: task2.address,
            success: true,
        });
    });
});


import { Blockchain, SandboxContract, printTransactionFees, TreasuryContract } from '@ton-community/sandbox';
import '@ton-community/test-utils';
import { toNano, Address, beginCell } from 'ton-core';
import { Task3 } from '../wrappers/Task3';

describe('Task3', () => {
    let blockchain: Blockchain;
    let task3: SandboxContract<Task3>;
    let deployer: SandboxContract<TreasuryContract>;
    let jettonA: SandboxContract<TreasuryContract>;
    let jettonB: SandboxContract<TreasuryContract>;

    it('should deploy', async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        jettonA = await blockchain.treasury('jettonA');
        jettonB = await blockchain.treasury('jettonB');

        task3 = blockchain.openContract(await Task3.fromInit(
            deployer.address as Address,
            jettonA.address as Address,
            jettonB.address as Address
        ));

        const deployResult = await task3.send(
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
            to: task3.address,
            deploy: true,
            success: true,
        });
    });

    const aIncreaseBy = 10n;
    const bIncreaseBy = 2n;

    it('should Admin add jettons A', async () => {
        const aBalanceBefore = await task3.getBalance(jettonA.address);
        console.log('balance A before increasing', aBalanceBefore);
        // const increaseBy = BigInt(Math.floor(Math.random() * 100));
        console.log('increasing by', aIncreaseBy);

        const refundResult = await task3.send(
            jettonA.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'TokenNotification',
                queryId: 0n,
                amount: aIncreaseBy,
                from: deployer.address,
                forwardPayload: beginCell().endCell()
            }
        );

        expect(refundResult.transactions).toHaveTransaction({
            from: jettonA.address,
            to: task3.address,
            success: true,
        });

        printTransactionFees(refundResult.transactions)

        const aBalanceAfter = await task3.getBalance(jettonA.address);

        console.log('balance A after increasing', aBalanceAfter);
        expect(aBalanceAfter).toBe(aBalanceBefore + aIncreaseBy);
    });

    it('should Admin add jettons B', async () => {
        const bBalanceBefore = await task3.getBalance(jettonB.address);
        console.log('balance B before increasing', bBalanceBefore);
        console.log('increasing by', bIncreaseBy);

        const refundResult = await task3.send(
            jettonB.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'TokenNotification',
                queryId: 0n,
                amount: bIncreaseBy,
                from: deployer.address,
                forwardPayload: beginCell().endCell()
            }
        );

        expect(refundResult.transactions).toHaveTransaction({
            from: jettonB.address,
            to: task3.address,
            success: true,
        });

        printTransactionFees(refundResult.transactions)

        const bBalanceAfter = await task3.getBalance(jettonB.address);

        console.log('balance B after increasing', bBalanceAfter);
        expect(bBalanceAfter).toBe(bBalanceBefore + bIncreaseBy);
    });

    it('should price B', async () => {
        const decimal = 1000000000n;
        const aBalance = await task3.getBalance(jettonA.address);
        console.log('balance A ', aBalance);
        const bBalance = await task3.getBalance(jettonB.address);
        console.log('balance B ', bBalance);
        const shouldPriceB = bBalance * decimal / aBalance
        console.log('should price B', shouldPriceB);

        const bPrice = await task3.getPrice(jettonB.address);
        console.log('price B', bPrice);
        expect(bPrice).toBe(shouldPriceB);
    });

    it('test', async () => {
    });
});



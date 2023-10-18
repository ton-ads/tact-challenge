import { Blockchain, SandboxContract, printTransactionFees, TreasuryContract } from '@ton-community/sandbox';
import '@ton-community/test-utils';
import { toNano, Address, beginCell } from 'ton-core';
import { Task5 } from '../wrappers/Task5';
import { flattenTransaction } from "@ton-community/test-utils";

describe('Task5', () => {
    let blockchain: Blockchain;
    let task5: SandboxContract<Task5>;
    let deployer: SandboxContract<TreasuryContract>;
    let nft: SandboxContract<TreasuryContract>;
    let nft2: SandboxContract<TreasuryContract>;
    let sender: SandboxContract<TreasuryContract>;

    it('should deploy', async () => {
        blockchain = await Blockchain.create();

        /*
        // https://github.com/ton-org/sandbox#viewing-logs
        blockchain.verbosity = {
            print: true,
            blockchainLogs: true,
            vmLogs: "none",
            debugLogs: true,
        }
        */

        deployer = await blockchain.treasury('deployer');
        nft = await blockchain.treasury('nft');
        nft2 = await blockchain.treasury('nft2');
        sender = await blockchain.treasury('sender');

        task5 = blockchain.openContract(await Task5.fromInit(
            1n,
            deployer.address as Address
        ));

        const deployResult = await task5.send(
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
            to: task5.address,
            deploy: true,
            success: true,
        });

        console.log('contract address', task5.address);
        console.log('deployer (admin) address', deployer.address);
        console.log('nft address', nft.address);
        console.log('sender address', sender.address);
    });

    it('should reject AdminWithdrawalAllNFTs: Invalid sender ', async () => {
        const shouldResult = await task5.send(
            sender.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'AdminWithdrawalAllNFTs',
                queryId: 0n
            }
        );

        printTransactionFees(shouldResult.transactions);

        expect(shouldResult.transactions).toHaveTransaction({
            from: sender.address,
            to: task5.address,
            success: false,
        });
    });

    it('should reject AdminWithdrawalAllNFTs: Insufficent funds ', async () => {
        const sentMessageResult = await task5.send(
            deployer.getSender(),
            {
                value: toNano('0.02'),
            },
            {
                $$type: 'AdminWithdrawalAllNFTs',
                queryId: 0n
            }
        );

        /*
        const arr = sentMessageResult.transactions.map(tx => flattenTransaction(tx));
        console.log(arr);
        */

        printTransactionFees(sentMessageResult.transactions);

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: task5.address,
            success: false,
        });
    });

    it('should OwnershipAssigned admin', async () => {
        const sentMessageResult = await task5.send(
            nft.getSender(),
            {
                value: toNano('0.1'),
            },
            {
                $$type: 'OwnershipAssigned',
                queryId: 0n,
                prevOwner: deployer.address,
                forwardPayload: beginCell().endCell()
            }
        );

        printTransactionFees(sentMessageResult.transactions);

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: nft.address,
            to: task5.address,
            success: true,
        });

        const counterAfter = await task5.getCount();
        console.log('count Nft after', counterAfter);

        const mapAfter = await task5.getNfts();
        console.log('map Nfts after', mapAfter);
    });

    it('should OwnershipAssigned sender get back', async () => {
        const sentMessageResult = await task5.send(
            nft2.getSender(),
            {
                value: toNano('0.1'),
            },
            {
                $$type: 'OwnershipAssigned',
                queryId: 0n,
                prevOwner: sender.address,
                forwardPayload: beginCell().endCell()
            }
        );

        printTransactionFees(sentMessageResult.transactions);

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: nft2.address,
            to: task5.address,
            success: true,
        });

        const counterAfter = await task5.getCount();
        console.log('count Nft after', counterAfter);

        const mapAfter = await task5.getNfts();
        console.log('map Nfts after', mapAfter);
    });

    it('should OwnershipAssigned sender get swap', async () => {

        for (let i = 0; i < 5; i++) {
            const n = await blockchain.treasury('nft-' + i);
            await task5.send(
                n.getSender(),
                {
                    value: toNano('0.1'),
                },
                {
                    $$type: 'OwnershipAssigned',
                    queryId: 0n,
                    prevOwner: deployer.address,
                    forwardPayload: beginCell().endCell()
                }
            )
        }

        const counterBefore = await task5.getCount();
        console.log('count Nft before', counterBefore);

        const sentMessageResult = await task5.send(
            nft2.getSender(),
            {
                value: toNano('2.1'),
            },
            {
                $$type: 'OwnershipAssigned',
                queryId: 0n,
                prevOwner: sender.address,
                forwardPayload: beginCell().endCell()
            }
        );

        printTransactionFees(sentMessageResult.transactions);

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: nft2.address,
            to: task5.address,
            success: true,
        });

        const counterAfter = await task5.getCount();
        console.log('count Nft after', counterAfter);

        const mapAfter = await task5.getNfts();
        console.log('map Nfts after', mapAfter);

        const profitAfter = await task5.getProfit();
        console.log('contract profit after', profitAfter);
    });

    it('should OwnershipAssigned sender get swap', async () => {

        for (let i = 0; i < 5; i++) {
            const n = await blockchain.treasury('nft-' + i);
            await task5.send(
                n.getSender(),
                {
                    value: toNano('0.1'),
                },
                {
                    $$type: 'OwnershipAssigned',
                    queryId: 0n,
                    prevOwner: deployer.address,
                    forwardPayload: beginCell().endCell()
                }
            )
        }

        const counterBefore = await task5.getCount();
        console.log('count Nft before', counterBefore);

        const sentMessageResult = await task5.send(
            nft2.getSender(),
            {
                value: toNano('2.1'),
            },
            {
                $$type: 'OwnershipAssigned',
                queryId: 0n,
                prevOwner: sender.address,
                forwardPayload: beginCell().endCell()
            }
        );

        printTransactionFees(sentMessageResult.transactions);

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: nft2.address,
            to: task5.address,
            success: true,
        });

        const counterAfter = await task5.getCount();
        console.log('count Nft after', counterAfter);

        const mapAfter = await task5.getNfts();
        console.log('map Nfts after', mapAfter);

        const profitAfter = await task5.getProfit();
        console.log('contract profit after', profitAfter);
    });
});




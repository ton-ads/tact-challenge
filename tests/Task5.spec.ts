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
    let nftCount: bigint;
    let contractProfit: bigint;

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

        console.log(
            '+ should deploy',
            '\ncontract address: ', task5.address,
            '\ndeployer (admin) address: ', deployer.address,
            '\nnft address', nft.address,
            '\nsender address', sender.address
        );

        const mapAfter = await task5.getNfts();
        nftCount = await task5.getCount();
        contractProfit = await task5.getProfit();
        console.log(
            '+ should deploy',
            '\nContract profit: ', contractProfit,
            '\nNft count: ', nftCount,
            '\nmap Nfts after: ', mapAfter
        );
    });

    it('should OwnershipAssigned admin', async () => {
        const nftCountBefore: bigint = nftCount;
        const contractProfitBefore: bigint = contractProfit;

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

        const mapAfter = await task5.getNfts();
        nftCount = await task5.getCount();
        contractProfit = await task5.getProfit();
        console.log(
            '+ should OwnershipAssigned admin',
            '\nContract profit: ', contractProfit,
            '\nNft count: ', nftCount,
            '\nmap Nfts after: ', mapAfter
        );

        printTransactionFees(sentMessageResult.transactions);

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: nft.address,
            to: task5.address,
            success: true,
        });

        expect(nftCount).toBe(nftCountBefore + 1n);
        expect(contractProfit).toBeGreaterThanOrEqual(contractProfitBefore);
    });

    it('should OwnershipAssigned sender get back', async () => {
        const nftCountBefore: bigint = nftCount;
        const contractProfitBefore: bigint = contractProfit;

        const sentMessageResult = await task5.send(
            nft2.getSender(),
            {
                value: toNano('0.014'),
            },
            {
                $$type: 'OwnershipAssigned',
                queryId: 0n,
                prevOwner: sender.address,
                forwardPayload: beginCell().endCell()
            }
        );

        const mapAfter = await task5.getNfts();
        nftCount = await task5.getCount();
        contractProfit = await task5.getProfit();

        console.log(
            '+ should OwnershipAssigned sender get back',
            '\nContract profit: ', contractProfit,
            '\nNft count: ', nftCount,
            '\nmap Nfts after: ', mapAfter
        );

        printTransactionFees(sentMessageResult.transactions);

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: nft2.address,
            to: task5.address,
            success: true,
        });

        expect(nftCount).toBe(nftCountBefore);
        expect(contractProfit).toBeGreaterThanOrEqual(contractProfitBefore);
    });

    it('should OwnershipAssigned admin loop', async () => {
        const nftCountBefore: bigint = nftCount;
        const contractProfitBefore: bigint = contractProfit;
        const nftAmount: bigint = 100n;
        for (let i = 0; i < nftAmount; i++) {
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

        const mapAfter = await task5.getNfts();
        nftCount = await task5.getCount();
        contractProfit = await task5.getProfit();

        expect(nftCount).toBe(nftCountBefore + nftAmount);
        expect(contractProfit).toBeGreaterThanOrEqual(contractProfitBefore);

        console.log(
            '+ should OwnershipAssigned admin loop',
            '\nContract profit: ', contractProfit,
            '\nNft count: ', nftCount,
            '\nmap Nfts after: ', mapAfter
        );
    });

    it('should AdminWithdrawalProfit: Insufficient privelegies ', async () => {
        const nftCountBefore: bigint = nftCount;
        const contractProfitBefore: bigint = contractProfit;

        const sentMessageResult = await task5.send(
            sender.getSender(),
            {
                value: toNano('1.03'),
            },
            {
                $$type: 'AdminWithdrawalProfit',
                queryId: 0n
            }
        );

        nftCount = await task5.getCount();
        contractProfit = await task5.getProfit();

        console.log(
            '+ should AdminWithdrawalProfit: Insufficient privelegies',
            '\nContract profit: ', contractProfit,
            '\nNft count: ', nftCount
        );

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: sender.address,
            to: task5.address,
            success: false,
        });

        expect(nftCount).toBe(nftCountBefore);
        expect(contractProfit).toBeLessThanOrEqual(contractProfitBefore);

        printTransactionFees(sentMessageResult.transactions);
    });

    it('should OwnershipAssigned sender get swap', async () => {
        const nftCountBefore: bigint = nftCount;
        const contractProfitBefore: bigint = contractProfit;

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

        nftCount = await task5.getCount();
        contractProfit = await task5.getProfit();

        console.log(
            '+ should OwnershipAssigned sender get swap',
            '\nContract profit: ', contractProfit,
            '\nNft count: ', nftCount
        );

        printTransactionFees(sentMessageResult.transactions);

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: nft2.address,
            to: task5.address,
            success: true,
        });
        expect(nftCount).toBe(nftCountBefore);
        // expect(contractProfit).toBeGreaterThanOrEqual(contractProfitBefore);
    });

    it('should OwnershipAssigned sender get swap 2', async () => {
        const nftCountBefore: bigint = nftCount;
        const contractProfitBefore: bigint = contractProfit;

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

        nftCount = await task5.getCount();
        contractProfit = await task5.getProfit();

        console.log(
            '+ should OwnershipAssigned sender get swap 2',
            '\nContract profit: ', contractProfit,
            '\nNft count: ', nftCount
        );

        printTransactionFees(sentMessageResult.transactions);

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: nft2.address,
            to: task5.address,
            success: true,
        });
        expect(nftCount).toBe(nftCountBefore);
        expect(contractProfit).toBeGreaterThanOrEqual(contractProfitBefore);
    });

    it('should AdminWithdrawalProfit: get profit ', async () => {
        const nftCountBefore: bigint = nftCount;
        const contractProfitBefore: bigint = contractProfit;

        const sentMessageResult = await task5.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'AdminWithdrawalProfit',
                queryId: 0n
            }
        );

        nftCount = await task5.getCount();
        contractProfit = await task5.getProfit();

        console.log(
            '+ should AdminWithdrawalProfit: get profit',
            '\nContract profit: ', contractProfit,
            '\nNft count: ', nftCount
        );

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: task5.address,
            success: true,
        });

        expect(nftCount).toBe(nftCountBefore);
        expect(contractProfit).toBeLessThanOrEqual(contractProfitBefore);

        printTransactionFees(sentMessageResult.transactions);
    });

    it('should reject AdminWithdrawalAllNFTs: Insufficent funds ', async () => {
        const sentMessageResult = await task5.send(
            deployer.getSender(),
            {
                value: toNano('0.99') + toNano('0.08') * nftCount,
            },
            {
                $$type: 'AdminWithdrawalAllNFTs',
                queryId: 0n
            }
        );

        //const arr = sentMessageResult.transactions.map(tx => flattenTransaction(tx));
        //console.log(arr);

        nftCount = await task5.getCount();
        contractProfit = await task5.getProfit();

        console.log(
            '+ should reject AdminWithdrawalAllNFTs: Insufficent funds',
            '\nContract profit: ', contractProfit,
            '\nNft count: ', nftCount
        );

        printTransactionFees(sentMessageResult.transactions);

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: task5.address,
            exitCode: 62515,
        });
    });

    it('should AdminWithdrawalAllNFTs: get all Nfts ', async () => {
        const nftCountBefore: bigint = nftCount;
        const contractProfitBefore: bigint = contractProfit;

        const sentMessageResult = await task5.send(
            deployer.getSender(),
            {
                value: toNano('1.00') + toNano('0.08') * nftCount,
            },
            {
                $$type: 'AdminWithdrawalAllNFTs',
                queryId: 0n
            }
        );

        const mapAfter = await task5.getNfts();
        nftCount = await task5.getCount();
        contractProfit = await task5.getProfit();

        console.log(
            '+ should AdminWithdrawalAllNFTs: get all Nfts',
            '\nContract profit: ', contractProfit,
            '\nNft count: ', nftCount,
            '\nmap Nfts after: ', mapAfter
        )

        printTransactionFees(sentMessageResult.transactions);

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: task5.address,
            success: true,
        });

        expect(nftCount).toBe(0n);
        expect(contractProfit).toBeGreaterThanOrEqual(contractProfitBefore);
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

        nftCount = await task5.getCount();
        contractProfit = await task5.getProfit();

        console.log(
            '+ should reject AdminWithdrawalAllNFTs: Invalid sender',
            '\nContract profit: ', contractProfit,
            '\nNft count: ', nftCount
        );

        printTransactionFees(shouldResult.transactions);

        expect(shouldResult.transactions).toHaveTransaction({
            from: sender.address,
            to: task5.address,
            success: false,
        });
    });

    /*
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
     

     */
});




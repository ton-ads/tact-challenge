import "@stdlib/deploy";
/*
  TASK 3 - DEX
  Create a simple jetton dex contract that trades one pair of jettons: A and B.
  The price of jettons depends on the amount of jettons that smart contract has.
  Therefore, the smart contract needs to keep track of how much jettons it has.
  
  Price for the jetton A in swap B->A should be calculated by formula "amountOfJettonAOnContract * decimal / amountOfJettonBOnContract".
  Token prices must be decimalized for accuracy, so it is the prices that must be adjusted to decimal 1e9.
  Decimals are only needed for price accuracy. It should be set as 1e9.
  So, if smart contract has 10 of jetton A and 2 of jetton B, then after sending 1 jetton B you should receive 5 of jettons A.

  Example formula for amountOfAJettonToSend in B->A swap will be
  (amountOfJettonAOnContract * decimal / amountOfJettonBOnContract) * amountOfTokenBToSwap / decimal

  If smart contract pool doesn't have enough jettons to trade,
  then it should send incoming jettons back to the user. For a clearer explanation,
  let's look at the example we described above (smart contract has 10 of jetton A and 2 of jetton B).
  If user will send 3 jettons B, smart contract should reject the message (because contract does not have 3 * 5 = 15 jettons A)
  and send 3 jettons B back to the user.

  If smart contract receives a different jetton (neither A nor B) then throw an error.

  Implement a getter that returns the number of jettons in the pool and
  one more to get the price of jetton A or jetton B.
  Getters' behavior with incorrect parameter (address other than that of jetton A or B)
  is undefined (there are no such tests).
  
  Note:
  Admin can add jettons A and B just by sending them to the smart contract (we need to add initial supply to the pool for it to be functional).
  To be exact: any jettons (A or B) received from the admin are "added". Admin can't swap.
*/

message(0x7362d09c) TokenNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    from: Address;
    forwardPayload: Slice as remaining;
}
// To simplify the testing process and the specificity of the messages being sent, we decided to add clear default values in this transaction
message(0xf8a7ea5) TokenTransfer {
    queryId: Int as uint64; // should be 0
    amount: Int as coins; // should be amount of jettons to send
    destination: Address; // should be user address / TokenNotification.from
    responseDestination: Address?; // should be myAddress()
    customPayload: Cell?; // should be null
    forwardTonAmount: Int as coins; // should be ton("0.01")
    forwardPayload: Slice as remaining; // should be emptySlice()
}

 fun sendJetton(jettonAddress: Address, value: Int, bounce: Bool, mode: Int, amount: Int, destination: Address) {
    send(SendParameters{to: jettonAddress,
            value: value,
            bounce: bounce,
            mode: mode,
            body: TokenTransfer{queryId: 0,
                amount: amount,
                destination: destination,
                responseDestination: myAddress(),
                customPayload: null,
                forwardTonAmount: ton("0.01"),
                forwardPayload: emptySlice()
            }.toCell()
        }
    );
}

struct Jetton {
    amount: Int;
    address: Address;
}

contract Task3 with Deployable {
    owner: Address;
    jettonA: Jetton;
    jettonB: Jetton;
    decimal: Int;
    init(admin: Address, newJettonAddressA: Address, newJettonAddressB: Address){
        self.owner = admin;
        self.jettonA = Jetton{amount: 0, address: newJettonAddressA};
        self.jettonB = Jetton{amount: 0, address: newJettonAddressB};
        // self.j.set(newJettonAddressB, Jetton{amount: 0, pair: newJettonAddressA});
        self.decimal = 1000000000;
    }

    receive(msg: TokenNotification){
        require(self.jettonA.address == sender() || self.jettonB.address == sender(), "!jettonAddress");
        let xAddress: Address = sender();
        let jettonX: Jetton = self.jettonB;
        let jettonY: Jetton = self.jettonA;
        if (self.jettonA.address == sender()) {
            jettonX = self.jettonA;
            jettonY = self.jettonB;
        }
        let xA: Int = jettonX.amount;
        let xAmount: Int = msg.amount;
        if (msg.from == self.owner) {
            jettonX.amount = xA + xAmount;
            // self.j.set(xAddress, jettonX);
            return ;
        }
        // let jettonY: Jetton = self.j.get(jettonX.pair)!!;
        let yA: Int = jettonY.amount;
        if (xA == 0 || yA == 0) {
            sendJetton(xAddress, 0, false, SendRemainingValue + SendIgnoreErrors, xAmount, msg.from);
            return ;
        }
        // (amountOfJettonAOnContract * decimal / amountOfJettonBOnContract) * amountOfTokenBToSwap / decimal
        // ???: let aSwap: Int = xA / jettonY.amount * xAmount ;
        let ySwap: Int = yA * self.decimal / xA * xAmount / self.decimal;
        if (yA < ySwap) {
            sendJetton(xAddress, 0, false, SendRemainingValue + SendIgnoreErrors, xAmount, msg.from);
            return ;
        }
        sendJetton(jettonY.address, ton("0.1"), true, 0, ySwap, msg.from);
        jettonY.amount = yA - ySwap;
        jettonX.amount = xA + xAmount;
        // self.j.set(xAddress, jettonX);
        // self.j.set(jettonX.pair, jettonY);
    }

    get fun price(jetton: Address): Int {
        if (self.jettonA.address == jetton) {
            return self.jettonB.amount * self.decimal / self.jettonA.amount;
        } else {
            return self.jettonA.amount * self.decimal / self.jettonB.amount;
        }
        /*
        let jX: Jetton = self.j.get(jetton)!!;
        let jY: Jetton = self.j.get(jX.pair)!!;
        return jY.amount * self.decimal / jX.amount;
        */
    }

    get fun balance(jetton: Address): Int {
        if (self.jettonA.address == jetton) {
            return self.jettonA.amount;
        } else {
            return self.jettonB.amount;
        }
        /*
        let jA: Jetton = self.j.get(jetton)!!;
        return jA.amount;
        */
    }
}
const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
 
// "web3": "^1.0.0-beta.26" work around
// 2 lines below
const provider = ganache.provider();
const web3 = new Web3(provider);
 
const { interface, bytecode } = require('../compile');
 
let accounts;
let lottery;
 
beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data: bytecode })
    .send({ from: accounts[0], gas: '1000000' });
    
  // "web3": "^1.0.0-beta.26"
  // line below
  lottery.setProvider(provider);
});
 
describe('Lottery Contract', () => {
  it('should deploys a contract', () => {
    assert.ok(lottery.options.address);
  });

  it('should allow one account to enter', async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('0.02', 'ether')
    });

    const players = await lottery.methods.getPlayers().call({
      from: accounts[0],
    })

    assert.strictEqual(accounts[0], players[0]);
    assert.strictEqual(1, players.length);
  });

  it('should allow multiple accounts to enter', async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('0.02', 'ether')
    });

    await lottery.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei('0.02', 'ether')
    });

    await lottery.methods.enter().send({
      from: accounts[2],
      value: web3.utils.toWei('0.02', 'ether')
    });

    const players = await lottery.methods.getPlayers().call({
      from: accounts[0],
    })

    assert.strictEqual(accounts[0], players[0]);
    assert.strictEqual(accounts[1], players[1]);
    assert.strictEqual(accounts[2], players[2]);
    assert.strictEqual(3, players.length);
  });

  it('should require a minimum amount of ether to enter', async () => {
    try {
      await lottery.methods.enter().send({
        from: accounts[0],
        value: 0,
      });
      assert(false)
    } catch (err) {
      assert(err)
    }
  });

  describe('pickWinner', () => {
    describe('when the manager calls pickWinner', () => {
      let initialBalance;
      let finalBalance;
      beforeEach(async () => {
        await lottery.methods.enter().send({
          from: accounts[0],
          value: web3.utils.toWei('2', 'ether')
        });
        initialBalance = await web3.eth.getBalance(accounts[0]);
        await lottery.methods.pickWinner().send({ from: accounts[0] });
        finalBalance = await web3.eth.getBalance(accounts[0]);
      });
      it('should sender money to the winner', async () => {
        const difference = finalBalance - initialBalance;
        assert(difference > web3.utils.toWei('1.8', 'ether'));
      });
      it('should reset the players array', async () => {
        const players = await lottery.methods.getPlayers().call({
          from: accounts[0],
        });
        assert.strictEqual(players.length, 0)
      });
    });
    describe('when the non manager calls pickWinner', () => {
      it('should throw an error', async () => {
        try {
          await lottery.methods.pickWinner().send({
            from: accounts[1],
          });
          assert(false)
        } catch (err) {
          assert(err)
        }
      });
    });
  });
});
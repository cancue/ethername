const Ethername = artifacts.require('./Ethername.sol')

contract('Managed', (accounts) => {
  let ethername

  before(async () => {
    ethername = await Ethername.deployed()
  })

  it('should set manager to msg.sender', async () => {
    let manager = await ethername.manager()
    assert(manager === accounts[0])
  })

  it('should set default commission to 200', async () => {
    let commission = await ethername.commission()
    assert.equal(commission.toNumber(), 200)
  })

  it('should get ether', async () => {
    let _val = web3.toWei(10, 'ether')
    await web3.eth.sendTransaction(
      {
        from: accounts[0],
        to: ethername.address,
        value: _val
      }
    )
    let _balance = await web3.eth.getBalance(ethername.address)
    assert.equal(_balance, _val)
  })

  it('withdrawBalance should transfer whole ether to manager', async () => {
    let _balanceBefore = await web3.eth.getBalance(ethername.address)
    assert(_balanceBefore.toNumber() > 0)
    let _managerOriginBalance = await web3.eth.getBalance(accounts[0])

    await ethername.withdrawBalance({
      from: accounts[1]
    })

    let _balanceAfter = await web3.eth.getBalance(ethername.address)
    assert.equal(_balanceAfter.toNumber(), 0)
    let _managerBalance = await web3.eth.getBalance(accounts[0])
    assert(_managerBalance.toNumber() - _managerOriginBalance.toNumber() > 0)
  })

  it('transferPower should work only by manager', async () => {
    try {
      await ethername.transferPower(accounts[2], {
        from: accounts[1]
      })
    } catch (err) {
      assert.equal(err, 'Error: VM Exception while processing transaction: revert')
    }

    await ethername.transferPower(accounts[2], {
      from: accounts[0]
    })
    let manager = await ethername.manager()
    assert(manager === accounts[2])
  })
})

contract('Managed - commission', (accounts) => {
  let ethername

  before(async () => {
    ethername = await Ethername.deployed()
  })

  describe('setCommission', () => {
    it('should work', async () => {
      let _res = await ethername.setCommission(9999, {
        from: accounts[0]
      })
      let commission = await ethername.commission()
      assert.equal(commission.toNumber(), 9999)
      assert.equal(_res.logs[0].event, 'Commission')
      assert.equal(_res.logs[0].args.basisPoint, 9999)
    })

    it('should not work if greater than 9999', async () => {
      let commissionBefore = await ethername.commission()
      try {
        await ethername.setCommission(10000, {
          from: accounts[0]
        })
      } catch (err) {
        assert.equal(err, 'Error: VM Exception while processing transaction: revert')
      }
      let commissionAfter = await ethername.commission()
      assert.equal(commissionBefore.toNumber(), commissionAfter.toNumber())
    })

    it('should ignore less than 1 wei on price', async () => {
      let commission = await ethername.commission()
      assert.equal(commission.toNumber(), 9999)

      await ethername.setPrice('root', 1234, {
        from: accounts[0]
      })

      let _res = await ethername.detailsOf('root', '')
      assert.equal(_res[1].toNumber(), Math.floor(1234 * 1.9999))
      assert.equal(_res[1].toNumber(), 2467)
    })
  })
})

contract('Managed - callFor', (accounts) => {
  let ethername

  before(async () => {
    ethername = await Ethername.deployed()
  })

  describe('self', () => {
    it('should work', async () => {
      let data = ethername.contract.setPrice.getData('', '1')
      await ethername.callFor(ethername.address, 0, 50000, data, {
        from: accounts[0]
      })

      let _res = await ethername.detailsOf('', '')
      assert.equal(_res[1].toString(), '1')
    })

    it('should work with ether', async () => {
      let _res = await ethername.detailsOf('root', '', {
        from: accounts[0]
      })
      assert.equal(_res[0], accounts[0])

      await ethername.setPrice('root', '2')

      let data = ethername.contract.buy.getData('root')
      await ethername.callFor(ethername.address, 2, 80000, data, {
        from: accounts[0],
        value: '2'
      })

      _res = await ethername.detailsOf('root', '')
      assert.equal(_res[0], ethername.address)
    })

    it('should not work if not manager', async () => {
      try {
        let data = ethername.contract.setPrice.getData('', '2')
        await ethername.callFor(ethername.address, 0, 50000, data, {
          from: accounts[1]
        })
      } catch (err) {
        assert.equal(err, 'Error: VM Exception while processing transaction: revert')
      }

      let _res = await ethername.detailsOf('', '')
      assert.notEqual(_res[1].toString(), '2')
    })
  })
})

let Ethername = artifacts.require("./Ethername.sol")

module.exports = function (deployer) {

  deployer.deploy(Ethername)

};

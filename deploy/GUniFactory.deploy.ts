import { deployments, getNamedAccounts } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getAddresses } from "../src/addresses";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (
    hre.network.name === "mainnet" ||
    hre.network.name === "optimism" ||
    hre.network.name === "polygon"
  ) {
    console.log(
      `!! Deploying GUniFactory to ${hre.network.name}. Hit ctrl + c to abort`
    );
    await new Promise((r) => setTimeout(r, 20000));
  }

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const addresses = getAddresses(hre.network.name);

  const guniPool = await deployments.get("GUniPool");

  await deploy("GUniFactory", {
    from: deployer,
    proxy: {
      proxyContract: "EIP173Proxy",
      owner: addresses.GelatoDevMultiSig,
      execute: {
        init: {
          methodName: "initialize",
          args: [
            guniPool.address,
            addresses.GelatoDevMultiSig,
            addresses.GelatoDevMultiSig,
          ],
        },
      },
    },
    args: [addresses.UniswapV3Factory],
  });
};

func.skip = async (hre: HardhatRuntimeEnvironment) => {
  const shouldSkip =
    hre.network.name === "mainnet" ||
    hre.network.name === "polygon" ||
    hre.network.name === "optimism" ||
    hre.network.name === "goerli";
  return shouldSkip ? true : false;
};

func.tags = ["GUniFactory"];

func.dependencies = ["GUniPool"];

export default func;

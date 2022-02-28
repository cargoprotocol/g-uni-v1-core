import { BigNumber } from "bignumber.js";
import { ethers } from "hardhat";
import {
  IERC20,
  IUniswapV3Factory,
  IUniswapV3Pool,
  GUniFactory,
} from "../typechain";
// eslint-disable-next-line
BigNumber.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });
// returns the sqrt price as a 64x96
function encodePriceSqrt(reserve1: string, reserve0: string) {
  return new BigNumber(reserve1)
    .div(reserve0)
    .sqrt()
    .multipliedBy(new BigNumber(2).pow(96))
    .integerValue(3)
    .toString();
}

async function main() {
  const ilanPublicAddress = "0x535CDe0F8339CD4b5bb5804f1DcaAE239920bB7D"; // test wallet
  const uniswapFactoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const [user0, gelato] = await ethers.getSigners();
  console.log("deploying uni factory");
  // const uniswapV3Factory = await ethers.getContractFactory("UniswapV3Factory");
  // const uniswapDeploy = await uniswapV3Factory.deploy();
  // const uniswapFactory = (await ethers.getContractAt(
  //   "IUniswapV3Factory",
  //   uniswapDeploy.address
  // )) as IUniswapV3Factory;
  const uniswapFactory = (await ethers.getContractAt(
    "IUniswapV3Factory",
    uniswapFactoryAddress
  )) as unknown as IUniswapV3Factory;
  console.log("deploying erc20 ");
  const mockERC20Factory = await ethers.getContractFactory("MockERC20");
  let token0 = (await mockERC20Factory.deploy("TOKEN 0", "T0")) as unknown as IERC20;
  let token1 = (await mockERC20Factory.deploy("TOKEN 1", "T1")) as unknown as IERC20;

  //   await token0.approve(
  //     swapTest.address,
  //     ethers.utils.parseEther("10000000000000")
  //   );
  //   await token1.approve(
  //     swapTest.address,
  //     ethers.utils.parseEther("10000000000000")
  //   );

  // Sort token0 & token1 so it follows the same order as Uniswap & the GUniPoolFactory
  if (
    ethers.BigNumber.from(token0.address).gt(
      ethers.BigNumber.from(token1.address)
    )
  ) {
    const tmp = token0;
    token0 = token1;
    token1 = tmp;
  }
  console.log("Token0 address: ", token0.address);
  console.log("Token1 address: ", token1.address);
  console.log("creating uni pool ");
  await uniswapFactory.createPool(token0.address, token1.address, "3000");
  const uniswapPoolAddress = await uniswapFactory.getPool(
    token0.address,
    token1.address,
    "3000"
  );
  const uniswapPool = (await ethers.getContractAt(
    "IUniswapV3Pool",
    uniswapPoolAddress
  )) as unknown as IUniswapV3Pool;
  console.log("init uni pool ");
  await uniswapPool.initialize(encodePriceSqrt("1", "1"));

  await uniswapPool.increaseObservationCardinalityNext("5");

  const gUniPoolFactory = await ethers.getContractFactory("GUniPool");
  // const gUniImplementation = await gUniPoolFactory.deploy(
  //   await gelato.getAddress()
  // );
  const gUniImplementation = await gUniPoolFactory.deploy(ilanPublicAddress);

  const implementationAddress = gUniImplementation.address;
  console.log("implementationAddress: ", implementationAddress);
  const gUniFactoryFactory = await ethers.getContractFactory("GUniFactory");
  console.log(
    "deploy guni factory - uniFactoryAddress: ",
    uniswapFactory.address
  );
  const gUniFactory = (await gUniFactoryFactory.deploy(
    uniswapFactory.address
  )) as unknown as GUniFactory;
  console.log("initialize factory ");
  // await gUniFactory.initialize(
  //   implementationAddress,
  //   await user0.getAddress(),
  //   await user0.getAddress()
  // );
  await gUniFactory.initialize(
    implementationAddress,
    ilanPublicAddress,
    "0x0000000000000000000000000000000000000000"
  );

  gUniFactory.on("PoolCreated", (uniPool: any, manager: any, pool: any) => {
    console.log("poolcreated! ", pool);
  });

  console.log("creating pool ");
  const createPoolTx: any = await gUniFactory.createManagedPool(
    token0.address,
    token1.address,
    3000,
    0,
    -887220,
    887220,
    {
      gasLimit: 1000000,
    }
  );
  console.log("createPoolTx: ", createPoolTx);

  await createPoolTx.wait();

  const wait = async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        console.log("timeout");
        resolve();
      }, 30000);
    });
  };
  await wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

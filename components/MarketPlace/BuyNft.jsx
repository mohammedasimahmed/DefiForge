import React, { useState } from "react";
import {
  useBuyDirectListing,
  useContract,
  Web3Button,
} from "@thirdweb-dev/react";
import { ListingType } from "@thirdweb-dev/sdk";
import { useSearchParams } from "next/navigation";

const contractAddress = "0x637f08e7Da6D9d6DbDDf348bd45C32004023EacF";

function BuyListing() {
  const searchParams = useSearchParams();
  const data = searchParams.get("tokenid");
  const { contract } = useContract(contractAddress, "marketplace-v3");
  const {
    mutateAsync: buyDirectListing,
    isLoading,
    error,
  } = useBuyDirectListing(contract);

  const [listingId, setListingId] = useState(data ? data : "");
  const [quantity, setQuantity] = useState(1);
  const [buyer, setBuyer] = useState("");

  const handleBuyNow = async () => {
    try {
      const result = await buyDirectListing({
        listingId: parseInt(listingId),
        quantity: parseInt(quantity),
        buyer,
      });

      // Handle successful transaction result
      console.log("Transaction successful", result);
    } catch (error) {
      // Handle transaction error
      console.error("Transaction error", error);
    }
  };

  return (
    <div className="mt-20  flex justify-center flex-col items-center ">
      <h1 className="text-4xl font-bold text-center text-purple-500 glow mt-9 mb-4">
        Buy your favorite NFT's
      </h1>

      <div className="flex w-screen flex-col md:flex-row justify-center md:px-10 lg:px-20 pt-8 items-center">
        <div
          className="relative flex flex-col h-2/3 w-3/4 md:w-1/2 nav_blur p-8 sm:p-12 md:p-8 lg:p-12 rounded z-10 mb-10"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.13)", zIndex: 10 }}
        >
          <label className="block my-2">Listing ID:</label>
          <input
            type="number"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            className="border border-gray-300 p-2 w-full rounded-md text-black"
          />

          <label className="block my-2">Quantity:</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="border border-gray-300 p-2 w-full rounded-md text-black"
          />

          <label className="block my-2">Buyer Wallet:</label>
          <input
            type="text"
            value={buyer}
            onChange={(e) => setBuyer(e.target.value)}
            className="border border-gray-300 p-2 w-full rounded-md text-black mb-4"
          />

          <Web3Button
            contractAddress={contractAddress}
            action={handleBuyNow}
            className="bg-blue-500 text-white p-2 rounded-md cursor-pointer"
          >
            Buy Now
          </Web3Button>
        </div>
        <div className="h-2/3 justify-center items-center">
          <img src="/images/buynft.png" alt="" />
        </div>
      </div>
    </div>
  );
}

export default BuyListing;

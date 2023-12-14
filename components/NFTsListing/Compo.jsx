"use client";
import React from "react";
import {
  useActiveClaimConditionForWallet,
  useAddress,
  useClaimConditions,
  useClaimerProofs,
  useClaimIneligibilityReasons,
  useContract,
  useContractMetadata,
  useTotalCirculatingSupply,
  Web3Button,
  useNFTs,
} from "@thirdweb-dev/react";
import { BigNumber, utils } from "ethers";
import { useMemo, useState, useEffect } from "react";
import { parseIneligibility } from "./ClaimEligibility";

const Compo = () => {
  const address = useAddress();
  const [quantity, setQuantity] = useState(1);
  const [tokenId, setTokenId] = useState(0);
  const { contract: editionDrop } = useContract(
    "0xa3aBB24C7CBb22E56AfFef3e4751163B0176dbDf"
  );
  const { data: contractMetadata } = useContractMetadata(editionDrop);

  const claimConditions = useClaimConditions(editionDrop);
  const activeClaimCondition = useActiveClaimConditionForWallet(
    editionDrop,
    address,
    tokenId
  );
  const claimerProofs = useClaimerProofs(editionDrop, address || "", tokenId);
  const claimIneligibilityReasons = useClaimIneligibilityReasons(
    editionDrop,
    {
      quantity,
      walletAddress: address || "",
    },
    tokenId
  );

  const claimedSupply = useTotalCirculatingSupply(editionDrop, tokenId);

  const totalAvailableSupply = useMemo(() => {
    try {
      return BigNumber.from(activeClaimCondition.data?.availableSupply || 0);
    } catch {
      return BigNumber.from(1_000_000);
    }
  }, [activeClaimCondition.data?.availableSupply]);

  const numberClaimed = useMemo(() => {
    return BigNumber.from(claimedSupply.data || 0).toString();
  }, [claimedSupply]);

  const numberTotal = useMemo(() => {
    const n = totalAvailableSupply.add(BigNumber.from(claimedSupply.data || 0));
    if (n.gte(1_000_000)) {
      return "";
    }
    return n.toString();
  }, [totalAvailableSupply, claimedSupply]);

  const priceToMint = useMemo(() => {
    const bnPrice = BigNumber.from(
      activeClaimCondition.data?.currencyMetadata.value || 0
    );
    return `${utils.formatUnits(
      bnPrice.mul(quantity).toString(),
      activeClaimCondition.data?.currencyMetadata.decimals || 18
    )} ${activeClaimCondition.data?.currencyMetadata.symbol}`;
  }, [
    activeClaimCondition.data?.currencyMetadata.decimals,
    activeClaimCondition.data?.currencyMetadata.symbol,
    activeClaimCondition.data?.currencyMetadata.value,
    quantity,
  ]);

  const maxClaimable = useMemo(() => {
    let bnMaxClaimable;
    try {
      bnMaxClaimable = BigNumber.from(
        activeClaimCondition.data?.maxClaimableSupply || 0
      );
    } catch (e) {
      bnMaxClaimable = BigNumber.from(1_000_000);
    }

    let perTransactionClaimable;
    try {
      perTransactionClaimable = BigNumber.from(
        activeClaimCondition.data?.maxClaimablePerWallet || 0
      );
    } catch (e) {
      perTransactionClaimable = BigNumber.from(1_000_000);
    }

    if (perTransactionClaimable.lte(bnMaxClaimable)) {
      bnMaxClaimable = perTransactionClaimable;
    }

    const snapshotClaimable = claimerProofs.data?.maxClaimable;

    if (snapshotClaimable) {
      if (snapshotClaimable === "0") {
        bnMaxClaimable = BigNumber.from(1_000_000);
      } else {
        try {
          bnMaxClaimable = BigNumber.from(snapshotClaimable);
        } catch (e) {}
      }
    }

    let max;
    if (totalAvailableSupply.lt(bnMaxClaimable)) {
      max = totalAvailableSupply;
    } else {
      max = bnMaxClaimable;
    }

    if (max.gte(1_000_000)) {
      return 1_000_000;
    }
    return max.toNumber();
  }, [
    claimerProofs.data?.maxClaimable,
    totalAvailableSupply,
    activeClaimCondition.data?.maxClaimableSupply,
    activeClaimCondition.data?.maxClaimablePerWallet,
  ]);

  const isSoldOut = useMemo(() => {
    try {
      return (
        (activeClaimCondition.isSuccess &&
          BigNumber.from(activeClaimCondition.data?.availableSupply || 0).lte(
            0
          )) ||
        numberClaimed === numberTotal
      );
    } catch (e) {
      return false;
    }
  }, [
    activeClaimCondition.data?.availableSupply,
    activeClaimCondition.isSuccess,
    numberClaimed,
    numberTotal,
  ]);

  const canClaim = useMemo(() => {
    return (
      activeClaimCondition.isSuccess &&
      claimIneligibilityReasons.isSuccess &&
      claimIneligibilityReasons.data?.length === 0 &&
      !isSoldOut
    );
  }, [
    activeClaimCondition.isSuccess,
    claimIneligibilityReasons.data?.length,
    claimIneligibilityReasons.isSuccess,
    isSoldOut,
  ]);

  const isLoading = useMemo(() => {
    return (
      activeClaimCondition.isLoading || claimedSupply.isLoading || !editionDrop
    );
  }, [activeClaimCondition.isLoading, editionDrop, claimedSupply.isLoading]);

  const buttonLoading = useMemo(
    () => isLoading || claimIneligibilityReasons.isLoading,
    [claimIneligibilityReasons.isLoading, isLoading]
  );
  const buttonText = useMemo(() => {
    if (isSoldOut) {
      return "Sold Out";
    }

    if (canClaim) {
      const pricePerToken = BigNumber.from(
        activeClaimCondition.data?.currencyMetadata.value || 0
      );
      if (pricePerToken.eq(0)) {
        return "Mint (Free)";
      }
      return `Mint (${priceToMint})`;
    }
    if (claimIneligibilityReasons.data?.length) {
      return parseIneligibility(claimIneligibilityReasons.data, quantity);
    }
    if (buttonLoading) {
      return "Checking eligibility...";
    }

    return "Claiming not available";
  }, [
    isSoldOut,
    canClaim,
    claimIneligibilityReasons.data,
    buttonLoading,
    activeClaimCondition.data?.currencyMetadata.value,
    priceToMint,
    quantity,
  ]);
  const { contract } = useContract(
    "0xa3aBB24C7CBb22E56AfFef3e4751163B0176dbDf"
  );

  const {
    data: nfts,
    isLoading: isNFTsLoading,
    error: nftsError,
  } = useNFTs(contract, { start: 0, count: 100 });

  return (
    <div className="container mt-24 ml-12">
      <div className="mint-info-container">
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <>
            {nfts.map((nft) => (
              <div>
                <div className="info-side">
                  <h1 className="collection-title">{`${nft.metadata.id}.${nft.metadata.name}`}</h1>
                  <p className="collection-description">
                    {nft.metadata.description}
                  </p>
                </div>

                <div className="image-side">
                  <img
                    className="collection-image"
                    src={nft.metadata.image}
                    alt={`${contractMetadata?.name} preview image`}
                  />

                  <div className="mint-completion-area">
                    <div className="mint-area-left">
                      <p>Total Minted</p>
                    </div>
                    <div className="mint-area-right">
                      {claimedSupply ? (
                        <p>
                          <b>{numberClaimed}</b>
                          {" / "}
                          {numberTotal || "∞"}
                        </p>
                      ) : (
                        <p>Loading...</p>
                      )}
                    </div>
                  </div>

                  {claimConditions.data?.length === 0 ||
                  claimConditions.data?.every(
                    (cc) => cc.maxClaimableSupply === "0"
                  ) ? (
                    <div>
                      <h2>
                        This drop is not ready to be minted yet. (No claim
                        condition set)
                      </h2>
                    </div>
                  ) : (
                    <>
                      <p>Quantity</p>
                      <div className="quantity-container">
                        <button
                          className="quantity-control-button"
                          onClick={() => setQuantity(quantity - 1)}
                          disabled={quantity <= 1}
                        >
                          -
                        </button>

                        <h4>{quantity}</h4>

                        <button
                          className="quantity-control-button"
                          onClick={() => setQuantity(quantity + 1)}
                          disabled={quantity >= maxClaimable}
                        >
                          +
                        </button>
                      </div>

                      <div className="mint-container">
                        {isSoldOut ? (
                          <div>
                            <h2>Sold Out</h2>
                          </div>
                        ) : (
                          <Web3Button
                            contractAddress={editionDrop?.getAddress() || ""}
                            action={(cntr) =>
                              cntr.erc1155.claim(nft.metadata.id, quantity)
                            }
                            isDisabled={!canClaim || buttonLoading}
                            onError={(err) => {
                              console.error(err);
                              alert("Error claiming NFTs");
                            }}
                            onSuccess={() => {
                              setQuantity(1);
                              alert("Successfully claimed NFTs");
                            }}
                          >
                            {buttonLoading ? "Loading..." : buttonText}
                          </Web3Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default Compo;

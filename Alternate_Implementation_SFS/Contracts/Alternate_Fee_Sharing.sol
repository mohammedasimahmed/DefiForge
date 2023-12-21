// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;



import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

/// @notice Implementation of CIP-001 https://github.com/Canto-Improvement-Proposals/CIPs/blob/main/CIP-001.md
/// @dev Every contract is responsible to register itself in the constructor by calling `register(address)`.
///      If contract is using proxy pattern, it's possible to register retroactively, however past fees will be lost.
///      Recipient withdraws fees by calling `withdraw(uint256,address,uint256)`.
contract Alternate_Fee_Sharing is Ownable, ERC721Enumerable {
    uint256 private _counter;

    mapping(uint256 => uint256) private _token_to_share;

    struct NftData {
        mapping(uint256 => uint256) tokenId_to_share;
        uint256[] tokenId_array;
        bool registered;
        uint256 balanceUpdatedBlock;
    }

    /// @notice maps smart contract address to tokenId
    mapping(address => NftData) public feeRecipient;

    /// @notice maps tokenId to fees earned
    mapping(uint256 => uint256) public balances;

    event Register(
        address smartContract,
        address[] recipient_array,
        uint256[] tokenId_array
    );
    event Assign(address smartContract, uint256 tokenId);
    event Withdraw(uint256 tokenId, address recipient, uint256 feeAmount);
    event DistributeFees(
        uint256 feeAmount,
        address smartContract,
        uint256 balanceUpdatedBlock
    );

    error NotAnOwner();
    error AlreadyRegistered();
    error Unregistered();
    error InvalidRecipient();
    error InvalidTokenId();
    error NothingToWithdraw();
    error NothingToDistribute();
    error BalanceUpdatedBlockOverlap();
    error InvalidBlockNumber();

    /// @dev only owner of _tokenId can call this function
    // modifier onlyNftOwner(uint256 _tokenId) {
    //     if (ownerOf(_tokenId) != msg.sender) revert NotAnOwner();

    //     _;
    // }

    /// @dev only smart contract that is unregistered can call this function
    modifier onlyUnregistered() {
        address smartContract = msg.sender;

        if (isRegistered(smartContract)) revert AlreadyRegistered();

        _;
    }

    constructor() ERC721("FeeSharing", "FeeSharing") Ownable(msg.sender) {}

    /// @notice Returns current value of counter used to tokenId of new minted NFTs
    /// @return current counter value
    function currentCounterId() external view returns (uint256) {
        return _counter;
    }

    /// @notice Returns tokenId that collects fees generated by the smart contract
    /// @param _smartContract address of the smart contract
    /// @return tokenId that collects fees generated by the smart contract
    // function getTokenId(
    //     address _smartContract
    // ) external view returns (uint256) {
    //     if (!isRegistered(_smartContract)) revert Unregistered();

    //     return feeRecipient[_smartContract].tokenId;
    // }

    /// @notice Returns true if smart contract is registered to collect fees
    /// @param _smartContract address of the smart contract
    /// @return true if smart contract is registered to collect fees, false otherwise
    function isRegistered(address _smartContract) public view returns (bool) {
        return feeRecipient[_smartContract].registered;
    }

    // @notice Returns last block where reward was calculated and granted to the smart contract.
    /// @param _smartContract address of the smart contract
    /// @return BlockNumber up to whicuint256 const = 20;h fees share have been calculated and granted to the smart contract
    function getBalanceUpdatedBlock(
        address _smartContract
    ) public view returns (uint256) {
        if (!isRegistered(_smartContract)) revert Unregistered();

        return feeRecipient[_smartContract].balanceUpdatedBlock;
    }

    /// @notice Checks wether the given tokenId exists or not.
    ///         Only callable by NFT owner
    /// @param _tokenId tokenId which will collect fees
    /// @return bool showing wether the tokenId exists or not
    function _exists(uint256 _tokenId) public view returns (bool) {
        if (_tokenId >= _counter) {
            return false;
        } else {
            return true;
        }
    }

    /// @notice Mints ownership NFT that allows the owner to collect fees earned by the smart contract. `msg.sender` is assumed to be a smart contract that earns fees. Only smart contract itself
    ///         can register a fee receipient.
    /// @param _recipient_array  array of the recipients for  the ownership  of NFT of given smart contract
    /// @param _share  array giving the share of individual recipient in the revenue share

    function register(
        address[] memory _recipient_array,
        uint256[] memory _share,
        address _smart_contract
    ) public onlyUnregistered {
        address smartContract = _smart_contract;

        uint256 _tokenId;
        uint256 len = _recipient_array.length;

        uint256[] memory _tokenId_array = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            if (_recipient_array[i] == address(0)) revert InvalidRecipient();

            _tokenId = _counter;
            _mint(_recipient_array[i], _tokenId);
            feeRecipient[smartContract].tokenId_array.push(_tokenId);
            _tokenId_array[i] = _tokenId;
            feeRecipient[smartContract].tokenId_to_share[_tokenId] = _share[i];
            _counter++;
        }

        emit Register(smartContract, _recipient_array, _tokenId_array);

        feeRecipient[smartContract].registered = true;
        feeRecipient[smartContract].balanceUpdatedBlock = block.number;
    }

    /// @notice Assigns smart contract to existing NFT. That NFT will collect fees generated by the smart contract.
    ///         Callable only by smart contract itself.
    /// @param _tokenId tokenId which will collect fees
    /// @return tokenId of the ownership NFT that collects fees
    function assign(uint256 _tokenId, uint256 _share) public returns (uint256) {
        address smartContract = msg.sender;

        if (!_exists(_tokenId)) revert InvalidTokenId();

        emit Assign(smartContract, _tokenId);
        feeRecipient[smartContract].tokenId_to_share[_tokenId] = _share;
        feeRecipient[smartContract].tokenId_array.push(_tokenId);

        feeRecipient[smartContract].registered = true;
        feeRecipient[smartContract].balanceUpdatedBlock = block.number;

        return _tokenId;
    }

    /// @notice Withdraws earned fees to `_recipient` address. Only callable by NFT owner.
    /// @param _tokenId token Id
    /// @param _amount amount of fees to withdraw
    /// @return amount of fees withdrawn    onlyNftOwner(
    function withdraw(
        uint256 _tokenId,
        uint256 _amount
    ) public returns (uint256) {
        uint256 earnedFees = balances[_tokenId];
        // console2.log("earned fees", earnedFees);
        if (earnedFees == 0 || _amount == 0) revert NothingToWithdraw();
        if (_amount > earnedFees) {
            _amount = earnedFees;
        }

        balances[_tokenId] = earnedFees - _amount;

        // console2.log("balance ", address(this).balance);
        // console2.log("balance after withdraw", balances[_tokenId]);

        bool sent = payable(msg.sender).send(_amount);
        // console2.log("sent", sent);

        require(sent, "Failed to send money");
        emit Withdraw(_tokenId, payable(msg.sender), _amount);

        return _amount;
    }

    /// @notice Distributes collected fees to the smart contract. Only callable by owner.
    /// @param  _smartContract  contract whose revenue share is to be given
    /// @param _blockNumber Block Number upto which the revenue share is calculated  onlyOwner
    function distributeFees(
        address _smartContract,
        uint256 _blockNumber
    ) public payable {
        // console2.log("data", string(msg.data));
        if (msg.value <= 0) revert NothingToDistribute();
        // if (_blockNumber <= getBalanceUpdatedBlock(_smartContract))
        //     revert BalanceUpdatedBlockOverlap();
        // if (_blockNumber > block.number) revert InvalidBlockNumber();
        uint256[] memory token_array = feeRecipient[_smartContract]
            .tokenId_array;
        uint256 share;
        for (uint256 i = 0; i < token_array.length; i++) {
            share = feeRecipient[_smartContract].tokenId_to_share[
                token_array[i]
            ];
            console2.log("share", share);
            (msg.value * 20) / 100;
            balances[token_array[i]] += (msg.value * share) / 100;
        }
        feeRecipient[_smartContract].balanceUpdatedBlock = _blockNumber;
        emit DistributeFees(msg.value, _smartContract, _blockNumber);
        console2.log("balance of SFS", address(this).balance);
    }

    function show_balance(uint256 tokenID) public view returns (uint256) {
        return (balances[tokenID]);
    }
}

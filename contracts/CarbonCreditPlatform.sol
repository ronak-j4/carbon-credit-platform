// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract CarbonCreditPlatform is AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    enum ProjectStatus { Pending, Approved, Rejected }

    struct Project {
        uint256 id;
        address submitter;
        string name;
        string location;
        string projectType;
        uint256 co2Tonnes;
        bytes32 fingerprint;
        ProjectStatus status;
        uint256 submittedAt;
    }

    struct Listing {
        uint256 id;
        uint256 projectId;
        address seller;
        uint256 amount; // credits remaining and available in this listing
        uint256 pricePerCredit; // price in wei, per single credit
        bool active;
    }

    uint256 private _nextProjectId = 1;
    mapping(uint256 => Project) public projects;
    mapping(bytes32 => bool) public fingerprintTaken;
    mapping(bytes32 => uint256) public fingerprintToProjectId;
    mapping(uint256 => mapping(address => uint256)) public creditBalance;
    mapping(uint256 => uint256) public totalRetired;

    uint256 private _nextListingId = 1;
    mapping(uint256 => Listing) public listings;

    event ProjectSubmitted(uint256 indexed projectId, address indexed submitter, bytes32 fingerprint, uint256 co2Tonnes);
    event ProjectApproved(uint256 indexed projectId, address indexed verifier, uint256 creditsIssued);
    event ProjectRejected(uint256 indexed projectId, address indexed verifier);
    event CreditsTransferred(uint256 indexed projectId, address indexed from, address indexed to, uint256 amount);
    event CreditsRetired(uint256 indexed projectId, address indexed owner, uint256 amount);
    event ListingCreated(uint256 indexed listingId, uint256 indexed projectId, address indexed seller, uint256 amount, uint256 pricePerCredit);
    event ListingCancelled(uint256 indexed listingId);
    event ListingSold(uint256 indexed listingId, address indexed buyer, uint256 amount, uint256 totalPaid, uint256 remainingAmount);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    function submitProject(
        string calldata name,
        string calldata location,
        string calldata projectType,
        uint256 co2Tonnes,
        bytes32 fingerprint
    ) external returns (uint256 projectId) {
        require(co2Tonnes > 0, "CO2 amount must be positive");
        require(!fingerprintTaken[fingerprint], "Duplicate project detected");

        projectId = _nextProjectId++;

        projects[projectId] = Project({
            id: projectId,
            submitter: msg.sender,
            name: name,
            location: location,
            projectType: projectType,
            co2Tonnes: co2Tonnes,
            fingerprint: fingerprint,
            status: ProjectStatus.Pending,
            submittedAt: block.timestamp
        });

        fingerprintTaken[fingerprint] = true;
        fingerprintToProjectId[fingerprint] = projectId;

        emit ProjectSubmitted(projectId, msg.sender, fingerprint, co2Tonnes);
    }

    function approveProject(uint256 projectId) external onlyRole(VERIFIER_ROLE) {
        Project storage p = projects[projectId];
        require(p.id != 0, "Project does not exist");
        require(p.status == ProjectStatus.Pending, "Project is not pending");

        p.status = ProjectStatus.Approved;
        creditBalance[projectId][p.submitter] += p.co2Tonnes;

        emit ProjectApproved(projectId, msg.sender, p.co2Tonnes);
    }

    function rejectProject(uint256 projectId) external onlyRole(VERIFIER_ROLE) {
        Project storage p = projects[projectId];
        require(p.id != 0, "Project does not exist");
        require(p.status == ProjectStatus.Pending, "Project is not pending");

        p.status = ProjectStatus.Rejected;
        fingerprintTaken[p.fingerprint] = false;

        emit ProjectRejected(projectId, msg.sender);
    }

    function transferCredits(uint256 projectId, address to, uint256 amount) external {
        require(to != address(0), "Cannot transfer to zero address");
        require(creditBalance[projectId][msg.sender] >= amount, "Insufficient credit balance");

        creditBalance[projectId][msg.sender] -= amount;
        creditBalance[projectId][to] += amount;

        emit CreditsTransferred(projectId, msg.sender, to, amount);
    }

    function retireCredits(uint256 projectId, uint256 amount) external {
        require(creditBalance[projectId][msg.sender] >= amount, "Insufficient credit balance");

        creditBalance[projectId][msg.sender] -= amount;
        totalRetired[projectId] += amount;

        emit CreditsRetired(projectId, msg.sender, amount);
    }

    function isDuplicate(bytes32 fingerprint) external view returns (bool) {
        return fingerprintTaken[fingerprint];
    }

    function getProject(uint256 projectId) external view returns (Project memory) {
        require(projects[projectId].id != 0, "Project does not exist");
        return projects[projectId];
    }

    function getCreditBalance(uint256 projectId, address holder) external view returns (uint256) {
        return creditBalance[projectId][holder];
    }

    // ---------------------------------------------------------------
    // MARKETPLACE
    // ---------------------------------------------------------------

    /**
     * @notice List credits for sale at a fixed price per credit (in wei).
     *         The listed amount is escrowed immediately (deducted from the
     *         seller's balance) so it cannot be double-listed or spent
     *         elsewhere while the listing is active.
     */
    function createListing(uint256 projectId, uint256 amount, uint256 pricePerCredit) external returns (uint256 listingId) {
        require(amount > 0, "Amount must be positive");
        require(pricePerCredit > 0, "Price must be positive");
        require(creditBalance[projectId][msg.sender] >= amount, "Insufficient credit balance");

        creditBalance[projectId][msg.sender] -= amount;

        listingId = _nextListingId++;
        listings[listingId] = Listing({
            id: listingId,
            projectId: projectId,
            seller: msg.sender,
            amount: amount,
            pricePerCredit: pricePerCredit,
            active: true
        });

        emit ListingCreated(listingId, projectId, msg.sender, amount, pricePerCredit);
    }

    /**
     * @notice Cancel an active listing and return the escrowed credits to
     *         the seller.
     */
    function cancelListing(uint256 listingId) external {
        Listing storage l = listings[listingId];
        require(l.id != 0, "Listing does not exist");
        require(l.active, "Listing not active");
        require(l.seller == msg.sender, "Not the seller");

        creditBalance[l.projectId][msg.sender] += l.amount;
        l.active = false;
        l.amount = 0;

        emit ListingCancelled(listingId);
    }

    /**
     * @notice Buy some or all of a listing's remaining credits. The buyer
     *         must send exactly amount * pricePerCredit in ETH. Supports
     *         partial fills — the listing stays active with a reduced
     *         amount unless the full remaining balance is purchased.
     */
    function buyListing(uint256 listingId, uint256 amount) external payable {
        Listing storage l = listings[listingId];
        require(l.id != 0, "Listing does not exist");
        require(l.active, "Listing not active");
        require(amount > 0 && amount <= l.amount, "Invalid amount");

        uint256 totalPrice = amount * l.pricePerCredit;
        require(msg.value == totalPrice, "Incorrect ETH sent");

        l.amount -= amount;
        if (l.amount == 0) {
            l.active = false;
        }

        creditBalance[l.projectId][msg.sender] += amount;

        address seller = l.seller;
        (bool sent, ) = payable(seller).call{value: msg.value}("");
        require(sent, "ETH transfer to seller failed");

        emit ListingSold(listingId, msg.sender, amount, msg.value, l.amount);
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        require(listings[listingId].id != 0, "Listing does not exist");
        return listings[listingId];
    }
}

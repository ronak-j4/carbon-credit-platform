// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract CarbonCreditPlatform is AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    uint256 public constant REQUIRED_VERIFIERS = 2;

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
        uint256 approvalsCount;
    }

    struct CreditBatch {
        uint256 batchId;
        uint256 projectId;
        uint256 totalSupply;
        uint256 activeSupply;
        uint256 retiredSupply;
        uint256 mintedAt;
        string vintage;
    }

    struct VerificationDocument {
        bytes32 docHash;
        string docType;
        string uri;
        address uploadedBy;
        uint256 uploadedAt;
    }

    struct RetirementRecord {
        uint256 certificateId;
        uint256 projectId;
        address retiree;
        string beneficiary;
        string retirementReason;
        uint256 amount;
        uint256 timestamp;
    }

    struct Listing {
        uint256 id;
        uint256 projectId;
        address seller;
        uint256 amount;
        uint256 pricePerCredit;
        bool active;
    }

    uint256 private _nextProjectId = 1;
    uint256 private _nextBatchId = 1;
    uint256 private _nextCertificateId = 1;
    uint256 private _nextListingId = 1;

    mapping(uint256 => Project) public projects;
    mapping(bytes32 => bool) public fingerprintTaken;
    mapping(bytes32 => uint256) public fingerprintToProjectId;
    mapping(uint256 => mapping(address => uint256)) public creditBalance;
    mapping(uint256 => uint256) public totalRetired;

    // Multi-verifier state
    mapping(uint256 => address[]) private _projectVerifiers;
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    // Batches & provenance
    mapping(uint256 => CreditBatch) public creditBatches;
    mapping(uint256 => uint256[]) private _projectBatches;

    // Off-chain document commitments
    mapping(uint256 => VerificationDocument[]) private _projectDocuments;

    // Retirement certificates
    mapping(uint256 => RetirementRecord) public retirementRecords;
    mapping(uint256 => uint256[]) private _projectRetirements;
    mapping(address => uint256[]) private _retireeRetirements;

    // Marketplace
    mapping(uint256 => Listing) public listings;

    // Events
    event ProjectSubmitted(uint256 indexed projectId, address indexed submitter, bytes32 fingerprint, uint256 co2Tonnes);
    event ProjectPartiallyApproved(uint256 indexed projectId, address indexed verifier, uint256 approvalsCount);
    event ProjectApproved(uint256 indexed projectId, address indexed verifier, uint256 creditsIssued);
    event ProjectRejected(uint256 indexed projectId, address indexed verifier);
    event BatchIssued(uint256 indexed batchId, uint256 indexed projectId, uint256 amount, string vintage);
    event DocumentAttached(uint256 indexed projectId, bytes32 indexed docHash, string docType, string uri, address indexed uploadedBy);
    event CreditsTransferred(uint256 indexed projectId, address indexed from, address indexed to, uint256 amount);
    event CreditsRetired(uint256 indexed projectId, address indexed owner, uint256 amount);
    event CertificateIssued(
        uint256 indexed certificateId,
        uint256 indexed projectId,
        address indexed retiree,
        uint256 amount,
        string beneficiary,
        string retirementReason
    );
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
            submittedAt: block.timestamp,
            approvalsCount: 0
        });

        fingerprintTaken[fingerprint] = true;
        fingerprintToProjectId[fingerprint] = projectId;

        emit ProjectSubmitted(projectId, msg.sender, fingerprint, co2Tonnes);
    }

    /**
     * @notice Approves a pending project. Requires 2 distinct accounts with VERIFIER_ROLE.
     *         The submitter cannot approve their own project.
     *         Credits are issued and a provenance batch is minted only once the 2nd approval is confirmed.
     */
    function approveProject(uint256 projectId) external onlyRole(VERIFIER_ROLE) {
        Project storage p = projects[projectId];
        require(p.id != 0, "Project does not exist");
        require(p.status == ProjectStatus.Pending, "Project is not pending");
        require(msg.sender != p.submitter, "Submitter cannot verify own project");
        require(!hasApproved[projectId][msg.sender], "Verifier already approved this project");

        hasApproved[projectId][msg.sender] = true;
        _projectVerifiers[projectId].push(msg.sender);
        p.approvalsCount++;

        if (p.approvalsCount < REQUIRED_VERIFIERS) {
            emit ProjectPartiallyApproved(projectId, msg.sender, p.approvalsCount);
        } else {
            p.status = ProjectStatus.Approved;
            creditBalance[projectId][p.submitter] += p.co2Tonnes;

            uint256 batchId = _nextBatchId++;
            creditBatches[batchId] = CreditBatch({
                batchId: batchId,
                projectId: projectId,
                totalSupply: p.co2Tonnes,
                activeSupply: p.co2Tonnes,
                retiredSupply: 0,
                mintedAt: block.timestamp,
                vintage: string(abi.encodePacked("BATCH-", _uint2str(batchId)))
            });
            _projectBatches[projectId].push(batchId);

            emit ProjectApproved(projectId, msg.sender, p.co2Tonnes);
            emit BatchIssued(batchId, projectId, p.co2Tonnes, creditBatches[batchId].vintage);
        }
    }

    function rejectProject(uint256 projectId) external onlyRole(VERIFIER_ROLE) {
        Project storage p = projects[projectId];
        require(p.id != 0, "Project does not exist");
        require(p.status == ProjectStatus.Pending, "Project is not pending");

        p.status = ProjectStatus.Rejected;
        fingerprintTaken[p.fingerprint] = false;

        emit ProjectRejected(projectId, msg.sender);
    }

    /**
     * @notice Commits an off-chain verification report or audit document hash on-chain.
     */
    function attachVerificationDocument(
        uint256 projectId,
        bytes32 docHash,
        string calldata docType,
        string calldata uri
    ) external {
        Project storage p = projects[projectId];
        require(p.id != 0, "Project does not exist");
        require(
            hasRole(VERIFIER_ROLE, msg.sender) || msg.sender == p.submitter || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to attach document"
        );
        require(docHash != bytes32(0), "Invalid document hash");

        _projectDocuments[projectId].push(VerificationDocument({
            docHash: docHash,
            docType: docType,
            uri: uri,
            uploadedBy: msg.sender,
            uploadedAt: block.timestamp
        }));

        emit DocumentAttached(projectId, docHash, docType, uri, msg.sender);
    }

    function transferCredits(uint256 projectId, address to, uint256 amount) external {
        require(to != address(0), "Cannot transfer to zero address");
        require(creditBalance[projectId][msg.sender] >= amount, "Insufficient credit balance");

        creditBalance[projectId][msg.sender] -= amount;
        creditBalance[projectId][to] += amount;

        emit CreditsTransferred(projectId, msg.sender, to, amount);
    }

    function retireCredits(uint256 projectId, uint256 amount) external returns (uint256 certificateId) {
        return _retireCreditsInternal(projectId, amount, "Self", "Voluntary Carbon Offset");
    }

    function retireCreditsWithDetails(
        uint256 projectId,
        uint256 amount,
        string calldata beneficiary,
        string calldata retirementReason
    ) external returns (uint256 certificateId) {
        return _retireCreditsInternal(projectId, amount, beneficiary, retirementReason);
    }

    function _retireCreditsInternal(
        uint256 projectId,
        uint256 amount,
        string memory beneficiary,
        string memory retirementReason
    ) internal returns (uint256 certificateId) {
        require(amount > 0, "Amount must be positive");
        require(creditBalance[projectId][msg.sender] >= amount, "Insufficient credit balance");

        creditBalance[projectId][msg.sender] -= amount;
        totalRetired[projectId] += amount;

        uint256 remainingToRetire = amount;
        uint256[] storage batchIds = _projectBatches[projectId];
        for (uint256 i = 0; i < batchIds.length && remainingToRetire > 0; i++) {
            CreditBatch storage b = creditBatches[batchIds[i]];
            if (b.activeSupply > 0) {
                uint256 take = b.activeSupply >= remainingToRetire ? remainingToRetire : b.activeSupply;
                b.activeSupply -= take;
                b.retiredSupply += take;
                remainingToRetire -= take;
            }
        }

        certificateId = _nextCertificateId++;
        string memory actualBeneficiary = bytes(beneficiary).length > 0 ? beneficiary : "Self";
        string memory actualReason = bytes(retirementReason).length > 0 ? retirementReason : "Voluntary Carbon Offset";

        retirementRecords[certificateId] = RetirementRecord({
            certificateId: certificateId,
            projectId: projectId,
            retiree: msg.sender,
            beneficiary: actualBeneficiary,
            retirementReason: actualReason,
            amount: amount,
            timestamp: block.timestamp
        });

        _projectRetirements[projectId].push(certificateId);
        _retireeRetirements[msg.sender].push(certificateId);

        emit CreditsRetired(projectId, msg.sender, amount);
        emit CertificateIssued(
            certificateId,
            projectId,
            msg.sender,
            amount,
            actualBeneficiary,
            actualReason
        );
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

    function getProjectVerifiers(uint256 projectId) external view returns (address[] memory) {
        return _projectVerifiers[projectId];
    }

    function getProjectDocuments(uint256 projectId) external view returns (VerificationDocument[] memory) {
        return _projectDocuments[projectId];
    }

    function getProjectBatches(uint256 projectId) external view returns (uint256[] memory) {
        return _projectBatches[projectId];
    }

    function getCreditBatch(uint256 batchId) external view returns (CreditBatch memory) {
        require(creditBatches[batchId].batchId != 0, "Batch does not exist");
        return creditBatches[batchId];
    }

    function getRetirementRecord(uint256 certificateId) external view returns (RetirementRecord memory) {
        require(retirementRecords[certificateId].certificateId != 0, "Certificate does not exist");
        return retirementRecords[certificateId];
    }

    function getProjectRetirements(uint256 projectId) external view returns (uint256[] memory) {
        return _projectRetirements[projectId];
    }

    function getRetireeRetirements(address retiree) external view returns (uint256[] memory) {
        return _retireeRetirements[retiree];
    }

    // ---------------------------------------------------------------
    // MARKETPLACE
    // ---------------------------------------------------------------

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

    function _uint2str(uint256 _i) internal pure returns (string memory str) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        str = string(bstr);
    }
}

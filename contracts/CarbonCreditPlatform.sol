// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CarbonCreditPlatform
 * @notice Registers carbon reduction projects, detects duplicates across
 *         submissions using a cryptographic fingerprint (hash), and issues,
 *         trades, and retires carbon credits for verified projects.
 *
 * ROLES
 *  - DEFAULT_ADMIN_ROLE : deployer. Can grant/revoke the VERIFIER_ROLE.
 *  - VERIFIER_ROLE      : trusted addresses (e.g. audited verification
 *                          bodies) who approve or reject submitted projects.
 *
 * HOW DUPLICATE DETECTION WORKS
 *  Each project is reduced to a single "fingerprint" — a keccak256 hash of
 *  its identifying details (name, location, project type), computed
 *  off-chain by the backend using normalized text (lowercase, trimmed) so
 *  that trivial formatting differences don't produce different hashes.
 *  The contract stores every fingerprint it has ever accepted. If the same
 *  fingerprint is submitted again, the transaction reverts — this is what
 *  stops the same real-world project from being registered twice, even by
 *  a different company or through a different route.
 */
contract CarbonCreditPlatform is AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    enum ProjectStatus {
        Pending,
        Approved,
        Rejected
    }

    struct Project {
        uint256 id;
        address submitter;
        string name;
        string location;
        string projectType; // e.g. "Solar", "Wind", "TreePlantation", "Biogas"
        uint256 co2Tonnes; // amount of CO2 (in whole tonnes) this project claims to offset
        bytes32 fingerprint; // duplicate-detection hash
        ProjectStatus status;
        uint256 submittedAt;
    }

    uint256 private _nextProjectId = 1;

    mapping(uint256 => Project) public projects;

    // fingerprint => true once a project with that fingerprint has been
    // submitted and is Pending or Approved. Used to block duplicates.
    mapping(bytes32 => bool) public fingerprintTaken;

    // fingerprint => the projectId that currently holds it (for lookups).
    mapping(bytes32 => uint256) public fingerprintToProjectId;

    // credit balances: projectId => holder address => balance
    mapping(uint256 => mapping(address => uint256)) public creditBalance;

    // total credits retired (permanently used) per project, for auditing
    mapping(uint256 => uint256) public totalRetired;

    event ProjectSubmitted(
        uint256 indexed projectId,
        address indexed submitter,
        bytes32 fingerprint,
        uint256 co2Tonnes
    );
    event ProjectApproved(uint256 indexed projectId, address indexed verifier, uint256 creditsIssued);
    event ProjectRejected(uint256 indexed projectId, address indexed verifier);
    event CreditsTransferred(uint256 indexed projectId, address indexed from, address indexed to, uint256 amount);
    event CreditsRetired(uint256 indexed projectId, address indexed owner, uint256 amount);

    constructor() {
        // The deployer becomes the admin and is also granted VERIFIER_ROLE
        // so the contract is immediately usable for local testing.
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    /**
     * @notice Submit a new carbon reduction project for verification.
     * @param name Project name (e.g. "Rajasthan Solar Farm Phase 2")
     * @param location Project location string
     * @param projectType Category, e.g. "Solar", "Wind", "TreePlantation", "Biogas"
     * @param co2Tonnes How many tonnes of CO2 this project claims to offset
     * @param fingerprint keccak256 hash computed off-chain from normalized
     *        (name, location, projectType) — see backend duplicate-detection
     *        service for the exact normalization rules.
     */
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

    /**
     * @notice Approve a pending project. Mints carbon credits 1:1 with the
     *         claimed CO2 tonnage directly to the original submitter.
     */
    function approveProject(uint256 projectId) external onlyRole(VERIFIER_ROLE) {
        Project storage p = projects[projectId];
        require(p.id != 0, "Project does not exist");
        require(p.status == ProjectStatus.Pending, "Project is not pending");

        p.status = ProjectStatus.Approved;
        creditBalance[projectId][p.submitter] += p.co2Tonnes;

        emit ProjectApproved(projectId, msg.sender, p.co2Tonnes);
    }

    /**
     * @notice Reject a pending project. Frees its fingerprint so a
     *         corrected resubmission is possible.
     */
    function rejectProject(uint256 projectId) external onlyRole(VERIFIER_ROLE) {
        Project storage p = projects[projectId];
        require(p.id != 0, "Project does not exist");
        require(p.status == ProjectStatus.Pending, "Project is not pending");

        p.status = ProjectStatus.Rejected;
        fingerprintTaken[p.fingerprint] = false;

        emit ProjectRejected(projectId, msg.sender);
    }

    /**
     * @notice Trade (transfer) credits for a given project to another address.
     */
    function transferCredits(uint256 projectId, address to, uint256 amount) external {
        require(to != address(0), "Cannot transfer to zero address");
        require(creditBalance[projectId][msg.sender] >= amount, "Insufficient credit balance");

        creditBalance[projectId][msg.sender] -= amount;
        creditBalance[projectId][to] += amount;

        emit CreditsTransferred(projectId, msg.sender, to, amount);
    }

    /**
     * @notice Permanently retire (use up) credits so they can never be
     *         traded or claimed again. This is how a company "spends" a
     *         credit to offset its own emissions.
     */
    function retireCredits(uint256 projectId, uint256 amount) external {
        require(creditBalance[projectId][msg.sender] >= amount, "Insufficient credit balance");

        creditBalance[projectId][msg.sender] -= amount;
        totalRetired[projectId] += amount;

        emit CreditsRetired(projectId, msg.sender, amount);
    }

    /**
     * @notice Check whether a fingerprint has already been used —
     *         lets the backend pre-check before even sending a transaction.
     */
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
}

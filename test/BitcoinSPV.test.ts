import { expect } from "chai";
import { ethers } from "hardhat";
import * as crypto from "crypto";

// Helper function to double SHA-256 hash
function hash256(buffer: Buffer): Buffer {
    return crypto.createHash("sha256").update(crypto.createHash("sha256").update(buffer).digest()).digest();
}

describe("BitcoinSPV", function () {
    let bitcoinSPV: any;
    let genesisHeader: Buffer;
    let genesisHash: Buffer;
    const target = ethers.MaxUint256; // High target accepts almost any PoW for simplicity

    beforeEach(async function () {
        // Create a mock genesis header
        const version = Buffer.alloc(4); version.writeUInt32LE(1);
        const prevHash = Buffer.alloc(32, 0); 
        const merkleRoot = Buffer.alloc(32, 0);
        const timestamp = Buffer.alloc(4); timestamp.writeUInt32LE(1000000);
        const bits = Buffer.alloc(4); bits.writeUInt32LE(0x1d00ffff);
        const nonce = Buffer.alloc(4); nonce.writeUInt32LE(0);
        
        genesisHeader = Buffer.concat([version, prevHash, merkleRoot, timestamp, bits, nonce]);
        genesisHash = hash256(genesisHeader);

        const BitcoinSPVFactory = await ethers.getContractFactory("BitcoinSPV");
        bitcoinSPV = await BitcoinSPVFactory.deploy("0x" + genesisHash.toString("hex"));
        await bitcoinSPV.waitForDeployment();
    });

    describe("Block Header Parsing", function () {
        it("should parse an 80-byte header correctly", async function () {
            const parsed = await bitcoinSPV.parseHeader("0x" + genesisHeader.toString("hex"));
            expect(parsed.version).to.equal(1);
            expect(parsed.timestamp).to.equal(1000000);
            expect(parsed.nonce).to.equal(0);
        });

        it("should reject an invalid length header", async function () {
            const invalidHeader = Buffer.alloc(79, 0);
            await expect(bitcoinSPV.parseHeader("0x" + invalidHeader.toString("hex")))
                .to.be.revertedWith("Invalid header length");
        });
    });

    describe("Header Chain Validation & PoW", function () {
        it("should successfully submit a valid consecutive header", async function () {
            // Create block 1 that points to genesis
            const version = Buffer.alloc(4); version.writeUInt32LE(1);
            const prevHash = genesisHash;
            const merkleRoot = Buffer.alloc(32, 0);
            const timestamp = Buffer.alloc(4); timestamp.writeUInt32LE(1000001);
            const bits = Buffer.alloc(4); bits.writeUInt32LE(0x1d00ffff);
            const nonce = Buffer.alloc(4); nonce.writeUInt32LE(1);
            
            const block1Header = Buffer.concat([version, prevHash, merkleRoot, timestamp, bits, nonce]);
            
            await expect(bitcoinSPV.submitHeader("0x" + block1Header.toString("hex"), target))
                .to.emit(bitcoinSPV, "HeaderSubmitted")
                .withArgs("0x" + hash256(block1Header).toString("hex"));
        });

        it("should reject an unconnected header", async function () {
            // Create an unconnected block
            const prevHash = Buffer.alloc(32, 1); // Not in knownHeaders
            const blockHeader = Buffer.concat([
                Buffer.alloc(4), prevHash, Buffer.alloc(32), Buffer.alloc(4), Buffer.alloc(4), Buffer.alloc(4)
            ]);

            await expect(bitcoinSPV.submitHeader("0x" + blockHeader.toString("hex"), target))
                .to.be.revertedWith("Previous block unknown");
        });

        it("should reject a header failing PoW check", async function () {
            // Ensure target 0 triggers a PoW failure 
            const version = Buffer.alloc(4); version.writeUInt32LE(1);
            const prevHash = genesisHash;
            const merkleRoot = Buffer.alloc(32, 0);
            const timestamp = Buffer.alloc(4); timestamp.writeUInt32LE(1000001);
            const bits = Buffer.alloc(4); bits.writeUInt32LE(0x1d00ffff);
            const nonce = Buffer.alloc(4); nonce.writeUInt32LE(1);
            
            const blockHeader = Buffer.concat([version, prevHash, merkleRoot, timestamp, bits, nonce]);

            await expect(bitcoinSPV.submitHeader("0x" + blockHeader.toString("hex"), 0n))
                .to.be.revertedWith("PoW target not met");
        });
    });

    describe("Merkle Proof Verification", function () {
        it("should verify a valid Merkle proof", async function () {
            // Build a small Merkle tree
            const tx1 = hash256(Buffer.from("tx1"));
            const tx2 = hash256(Buffer.from("tx2"));
            const tx3 = hash256(Buffer.from("tx3"));
            const tx4 = hash256(Buffer.from("tx4"));

            const level1_0 = hash256(Buffer.concat([tx1, tx2]));
            const level1_1 = hash256(Buffer.concat([tx3, tx4]));
            const root = hash256(Buffer.concat([level1_0, level1_1]));

            // Proof for tx2 (index 1)
            const proof = [
                "0x" + tx1.toString("hex"),
                "0x" + level1_1.toString("hex")
            ];

            const isValid = await bitcoinSPV.verifyTxInclusion(
                "0x" + tx2.toString("hex"),
                "0x" + root.toString("hex"),
                proof,
                1 // index 1
            );

            expect(isValid).to.be.true;
        });

        it("should reject an invalid Merkle proof", async function () {
            const tx1 = hash256(Buffer.from("tx1"));
            const root = hash256(Buffer.from("random_root"));

            const isValid = await bitcoinSPV.verifyTxInclusion(
                "0x" + tx1.toString("hex"),
                "0x" + root.toString("hex"),
                [],
                0
            );

            expect(isValid).to.be.false;
        });
    });
});

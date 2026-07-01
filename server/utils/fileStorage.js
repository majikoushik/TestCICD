/**
 * File storage abstraction — local disk by default, AWS S3 or Azure Blob
 * Storage when configured via environment variables. No code change is
 * required to switch: whichever provider's env vars are present at process
 * start is the one used; if none are present, everything falls back to the
 * existing local-disk behavior with no error.
 *
 * Precedence when multiple are configured: S3 > Azure Blob > local disk.
 *
 *   AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_S3_BUCKET   -> S3 mode
 *   AZURE_STORAGE_CONNECTION_STRING + AZURE_STORAGE_CONTAINER  -> Azure Blob mode
 *   (none of the above)                                        -> local disk mode
 *
 * References stored in the database are self-describing strings:
 *   local:  absolute filesystem path (unchanged from the original implementation)
 *   s3:     "s3://<bucket>/<key>"
 *   azure:  "azure://<container>/<blobName>"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const logger = require('./logger');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

function getStorageMode() {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET) {
    return 's3';
  }
  if (process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.AZURE_STORAGE_CONTAINER) {
    return 'azure';
  }
  return 'local';
}

// ── Lazily-constructed provider clients (only instantiated if actually used) ──

let _s3Client = null;
function getS3Client() {
  if (!_s3Client) {
    const { S3Client } = require('@aws-sdk/client-s3');
    _s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
  }
  return _s3Client;
}

let _blobServiceClient = null;
function getBlobServiceClient() {
  if (!_blobServiceClient) {
    const { BlobServiceClient } = require('@azure/storage-blob');
    _blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  }
  return _blobServiceClient;
}

function generatedFilename(req, file) {
  const ext = path.extname(file.originalname) || '';
  const userId = req.user?.id || req.user?._id || 'anon';
  return `${userId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
}

// ── Custom multer storage engines for S3 / Azure Blob ──────────────────────────
// (multer's storage engine contract: _handleFile(req, file, cb) and _removeFile(req, file, cb))

function s3MulterStorage(subfolder) {
  const bucket = process.env.AWS_S3_BUCKET;
  return {
    _handleFile(req, file, cb) {
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      const key = `${subfolder}/${generatedFilename(req, file)}`;
      const chunks = [];
      file.stream.on('data', (chunk) => chunks.push(chunk));
      file.stream.on('error', cb);
      file.stream.on('end', async () => {
        try {
          const body = Buffer.concat(chunks);
          await getS3Client().send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: file.mimetype,
          }));
          cb(null, { size: body.length, key, bucket, storageRef: `s3://${bucket}/${key}` });
        } catch (err) {
          cb(err);
        }
      });
    },
    _removeFile(req, file, cb) {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: file.key }))
        .then(() => cb(null))
        .catch(cb);
    },
  };
}

function azureMulterStorage(subfolder) {
  const containerName = process.env.AZURE_STORAGE_CONTAINER;
  return {
    _handleFile(req, file, cb) {
      const blobName = `${subfolder}/${generatedFilename(req, file)}`;
      const chunks = [];
      file.stream.on('data', (chunk) => chunks.push(chunk));
      file.stream.on('error', cb);
      file.stream.on('end', async () => {
        try {
          const containerClient = getBlobServiceClient().getContainerClient(containerName);
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);
          const body = Buffer.concat(chunks);
          await blockBlobClient.uploadData(body, {
            blobHTTPHeaders: { blobContentType: file.mimetype },
          });
          cb(null, { size: body.length, blobName, container: containerName, storageRef: `azure://${containerName}/${blobName}` });
        } catch (err) {
          cb(err);
        }
      });
    },
    _removeFile(req, file, cb) {
      const containerClient = getBlobServiceClient().getContainerClient(containerName);
      containerClient.getBlockBlobClient(file.blobName).deleteIfExists()
        .then(() => cb(null))
        .catch(cb);
    },
  };
}

/**
 * Build a multer instance for a given upload category (e.g. 'kyc', 'avatars').
 * Automatically picks local disk / S3 / Azure Blob based on env vars.
 *
 * @param {string} subfolder    Logical folder name, used as a key/path prefix in every mode
 * @param {object} multerOpts   Passed through to multer() (limits, fileFilter, etc.)
 */
function createUpload(subfolder, multerOpts = {}) {
  const mode = getStorageMode();

  if (mode === 's3') {
    logger.info(`[fileStorage] "${subfolder}" uploads -> AWS S3 bucket "${process.env.AWS_S3_BUCKET}"`);
    return multer({ storage: s3MulterStorage(subfolder), ...multerOpts });
  }

  if (mode === 'azure') {
    logger.info(`[fileStorage] "${subfolder}" uploads -> Azure Blob container "${process.env.AZURE_STORAGE_CONTAINER}"`);
    return multer({ storage: azureMulterStorage(subfolder), ...multerOpts });
  }

  // Local disk (default / fallback) — identical to the original implementation
  const uploadDir = path.join(UPLOADS_ROOT, subfolder);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, generatedFilename(req, file)),
  });

  return multer({ storage, ...multerOpts });
}

/**
 * The reference to persist in the database for a just-uploaded file.
 * Local mode returns the absolute filesystem path (unchanged from before);
 * cloud modes return a self-describing "s3://..." / "azure://..." string.
 */
function getStoredReference(file) {
  return file.storageRef || file.path;
}

/**
 * A URL suitable for direct <img>/browser access. Only meaningful for
 * public-read content (e.g. avatars) — do not use this for KYC documents.
 * Assumes the S3 bucket / Azure container is configured for public read on
 * these objects (or is fronted by a CDN); otherwise use getReadStream()
 * behind an authenticated route instead, as onboarding/KYC docs do.
 */
function getPublicUrl(file, subfolder) {
  const mode = getStorageMode();
  if (mode === 's3') {
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${file.bucket}.s3.${region}.amazonaws.com/${file.key}`;
  }
  if (mode === 'azure') {
    const accountName = getBlobServiceClient().accountName;
    return `https://${accountName}.blob.core.windows.net/${file.container}/${file.blobName}`;
  }
  return `/uploads/${subfolder}/${file.filename}`;
}

function isLocalReference(reference) {
  return !!reference && !reference.startsWith('s3://') && !reference.startsWith('azure://');
}

function parseReference(reference) {
  if (reference.startsWith('s3://')) {
    const [, , bucket, ...keyParts] = reference.split('/');
    return { mode: 's3', bucket, key: keyParts.join('/') };
  }
  if (reference.startsWith('azure://')) {
    const [, , container, ...blobParts] = reference.split('/');
    return { mode: 'azure', container, blobName: blobParts.join('/') };
  }
  return { mode: 'local', localPath: reference };
}

/** Does the referenced file exist? */
async function fileExists(reference) {
  if (!reference) return false;
  const ref = parseReference(reference);
  if (ref.mode === 'local') return fs.existsSync(ref.localPath);

  if (ref.mode === 's3') {
    try {
      const { HeadObjectCommand } = require('@aws-sdk/client-s3');
      await getS3Client().send(new HeadObjectCommand({ Bucket: ref.bucket, Key: ref.key }));
      return true;
    } catch (_) {
      return false;
    }
  }

  if (ref.mode === 'azure') {
    const containerClient = getBlobServiceClient().getContainerClient(ref.container);
    return await containerClient.getBlockBlobClient(ref.blobName).exists();
  }

  return false;
}

/** Returns a readable stream for the referenced file — works across all storage modes. */
async function getReadStream(reference) {
  const ref = parseReference(reference);

  if (ref.mode === 'local') return fs.createReadStream(ref.localPath);

  if (ref.mode === 's3') {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const result = await getS3Client().send(new GetObjectCommand({ Bucket: ref.bucket, Key: ref.key }));
    return result.Body;
  }

  if (ref.mode === 'azure') {
    const containerClient = getBlobServiceClient().getContainerClient(ref.container);
    const downloadResponse = await containerClient.getBlockBlobClient(ref.blobName).download();
    return downloadResponse.readableStreamBody;
  }

  throw new Error(`Unknown storage reference: ${reference}`);
}

/** Deletes the referenced file — works across all storage modes. Never throws for a missing file. */
async function deleteFile(reference) {
  if (!reference) return;
  const ref = parseReference(reference);

  try {
    if (ref.mode === 'local') {
      if (fs.existsSync(ref.localPath)) fs.unlinkSync(ref.localPath);
      return;
    }
    if (ref.mode === 's3') {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      await getS3Client().send(new DeleteObjectCommand({ Bucket: ref.bucket, Key: ref.key }));
      return;
    }
    if (ref.mode === 'azure') {
      const containerClient = getBlobServiceClient().getContainerClient(ref.container);
      await containerClient.getBlockBlobClient(ref.blobName).deleteIfExists();
    }
  } catch (err) {
    logger.warn('[fileStorage] deleteFile failed (non-fatal)', { reference, error: err.message });
  }
}

module.exports = {
  getStorageMode,
  createUpload,
  getStoredReference,
  getPublicUrl,
  isLocalReference,
  fileExists,
  getReadStream,
  deleteFile,
};

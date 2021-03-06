const crypto = require('crypto');
const RIPEMD160 = require('ripemd160');
const base58Check = require('bs58check');
const EC = require('elliptic').ec;
const scrypt = require('scryptsy');
const keccak = require('keccak');
const int64 = require('int64-buffer').Int64LE;
const txTypeStr = [
  "None", 
  "SupplyTransaction", 
  "TransferTransaction",
  "VoteTransaction",
  "RegisterDelegateTransaction",
  "OtherSignTransaction",
  "SignTransaction",
  "LockTransaction",
  "UnlockTransaction"
];

module.exports.toTransactionTypeStr = (type) => {
  if (type < 0 || txTypeStr.length <= type)
    return txTypeStr[0];
  return txTypeStr[type];
}

module.exports.toFixed8Str = (v) => {
  if (isNaN(v))
    return undefined;
  let str = String(v);
  while (str.length < 9)
    str = '0' + str;
  return str.slice(0, str.length - 8) + '.' + str.slice(str.length - 8);
}

module.exports.toFixed8Long = (str) => {
  if (isNaN(str))
    return undefined;
  let idx = str.indexOf('.');
  let fixedLen = idx === -1 ? 0 : str.length - idx - 1;
  if (8 < fixedLen)
    return undefined;
  str = str.replace('.', '');
  while (fixedLen < 8) {
    str += '0'
    ++fixedLen;
  }
  return new int64(str);
}

module.exports.toPubkey = (prikey) => {
  let ec = new EC('secp256k1');
  let key = ec.keyFromPrivate(prikey, 'bytes');
  let pubkey = key.getPublic();
  let x = pubkey.x;
  let y = pubkey.y;
  let xhex = x.toString('hex');
  while (xhex.length < 64) {
    xhex = "0" + xhex;
  }
  let yhex = y.toString('hex');
  while (yhex.length < 64) {
    yhex = "0" + yhex;
  }
  let pubkeyhex = "04" + xhex + yhex;
  return Buffer.from(pubkeyhex, 'hex');
}

module.exports.toAddress = (pubkey) => {
  if (typeof(pubkey) === 'string') {
    pubkey = Buffer.from(pubkey, 'hex');
  }
  let buf = Buffer.alloc(21);
  buf[0] = 0;
  let sha = crypto.createHash('sha256').update(pubkey).digest();
  let rip = new RIPEMD160().update(sha).digest();
  rip.copy(buf, 1, 0, 20);
  return base58Check.encode(buf);
}

module.exports.toAddressFromHash = (hash) => {
  if (typeof(hash) === 'string') {
    hash = Buffer.from(hash, 'hex');
  }
  let buf = Buffer.alloc(21);
  buf[0] = 0;
  hash.copy(buf, 1, 0, 20);
  return base58Check.encode(buf); 
}

module.exports.toAddressHash = (address) => {
  let buf = base58Check.decode(address);
  if (buf.length !== 21)
    return null;
  let result = Buffer.alloc(20);
  buf.copy(result, 0, 1, 21);
  return result;
}

module.exports.generatePrivateKey = () => {
  let ec = new EC('secp256k1');
  let key = ec.genKeyPair();
  let priKey = key.getPrivate();
  let priKeyHex = priKey.toString('hex');
  while (priKeyHex.length < 64) {
    priKeyHex = "0" + priKeyHex;
  }
  return Buffer.from(priKeyHex, "hex");
}

module.exports.generateAccount = () => {
  let prikey = this.generatePrivateKey();
  let pubkey = this.getPubKeyFromPriKey(prikey);
  let address = this.getAddressFromPubKey(pubkey);

  return {
    privateKey : prikey.toString('hex'),
    address: address
  }
}

module.exports.encryptKey = (password, params, alg = "scrypt") => {
  if (alg === "scrypt")
    return scrypt(Buffer.from(password, 'utf8'), Buffer.from(params.salt, 'hex'), params.n, params.r, params.p, params.dklen);
  else
    return null;
}

module.exports.encryptString = (text, key, iv, alg = "aes-128-ctr") => {
  if (typeof text === "string")
    text = Buffer.from(text, "hex");
  if (typeof iv === "string")
    iv = Buffer.from(iv, "hex");

  let cipher = crypto.createCipheriv(alg, key.slice(0, 16), iv);
  let ciphertext = cipher.update(text);
  return Buffer.concat([ciphertext, cipher.final()]).toString('hex');
}

module.exports.generateMac = (text, password) => {
  let buf = Buffer.concat([password.slice(16, 32), Buffer.from(text, 'hex')]);
  return keccak('keccak256').update(buf).digest().toString('hex');
}

module.exports.decryptString = (text, key, iv, alg = "aes-128-ctr") => {
  if (typeof text === "string")
    text = Buffer.from(text, "hex");
  if (typeof iv === "string")
    iv = Buffer.from(iv, "hex");

  let decipher = crypto.createDecipheriv(alg, key.slice(0, 16), iv);
  let deciphertext = decipher.update(text);
  return Buffer.concat([deciphertext, decipher.final()]).toString('hex');
}
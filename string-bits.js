const capitalRegex = /[A-Z]/;

const getBitArrayForText = (text) => {
  // const chars = Array.from(text);
  // const bitArrayForText = [];
  // for (let i = 0; i < text.length; i++) {
  //   bitArrayForText.push(capitalRegex.test(text.charAt(i)) ? 1 : 0);
  // }
  // return bitArrayForText;
  return Array.from(text).map(char => capitalRegex.test(char) ? 1 : 0);
};

const getBitStringForArray = (bitArray) => {
  return bitArray.map(b => b ? "1" : "0").join("");
};

// const testString = "aBcDeFgH";
const testString = Array.from(Array(8).keys()).map(() => "A");

const testStrings = [
  "abcd",
  "abcD",
  "abCd",
  "aBcd",
  "Abcd",
  "abCD",
  "aBCd",
  "ABcd",
];

const textLength = testString.length;

const getCapitalBitString = (text) => Array.from(text).map(char => capitalRegex.test(char) ? 1 : 0).join("");
const getCapitalNumber = (text) => parseInt(getCapitalBitString(text), 2);
const getCapitalHexString = (text) => parseInt(getCapitalBitString(text), 2).toString(16);

const capitalNumber = getCapitalNumber(testString);
const capitalHexString = getCapitalHexString(testString);
const small = capitalNumber < Number.MAX_SAFE_INTEGER;
const big = capitalNumber > Number.MAX_SAFE_INTEGER;
const base64 = Buffer.from(testString).toString('base64');

console.log(JSON.stringify({
  textLength,
  capitalHexString,
  capitalNumber,
  small,
  big,
  base64
}, null, "  "));


// let data = 'stackabuse.com';
// let buff = Buffer.from(data);
// let base64data = buff.toString('base64');

// console.log('"' + data + '" converted to Base64 is "' + base64data + '"');


// let data = 'c3RhY2thYnVzZS5jb20=';
// let buff = Buffer.from(data, 'base64');
// let text = buff.toString('ascii');

// console.log('"' + data + '" converted from Base64 to ASCII is "' + text + '"');
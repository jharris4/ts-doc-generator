function getEscapedText(text) {
  const textWithBackslashes = text
    .replace(/\\/g, "\\\\") // first replace the escape character
    .replace(/[*#[\]_|`~]/g, (x) => "\\" + x) // then escape any special characters
    .replace(/---/g, "\\-\\-\\-") // hyphens only if it's 3 or more
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return textWithBackslashes;
}

const ampersandRegex = /&/g;

const htmlEntityRegex =
  /&(?:\#(?:(?<dec>[0-9]+)|[Xx](?<hex>[0-9A-Fa-f]+))|(?<named>[A-Za-z0-9]+));/g;

/*
/&(?:\#(?:(?<dec>[0-9]+)|[Xx](?<hex>[0-9A-Fa-f]+))|(?<named>[A-Za-z0-9]+));/g
&(?:\#(?:(?<dec>[0-9]+)|[Xx](?<hex>[0-9A-Fa-f]+))|(?<named>[A-Za-z0-9]+));

&(?:\#(?:(?<dec>[0-9]+)|[Xx](?<hex>[0-9A-Fa-f]+))|(?<named>[A-Za-z0-9]+));

&
(?:
  \#
  (?:
    (?
      <dec>[0-9]+
    )
    |
    [Xx]
    (?
      <hex>[0-9A-Fa-f]+
    )
  )
  |
  (?
    <named>[A-Za-z0-9]+
  )
)
;

*/

const safeAmpersandRegex =
  /&(?!(?:\#(?:(?<dec>[0-9]+)|[Xx](?<hex>[0-9A-Fa-f]+))|(?<named>[A-Za-z0-9]+));)/g;

function getRegexMatches(text, regex) {
  const matches = text.match(regex);
  if (matches) {
    return "matches: " + matches.join(", ");
  } else {
    return "no matches";
  }
}

function logEscapeText(text) {
  const escapedText = getEscapedText(text);
  console.log(
    "escaping text: { " +
      text +
      " } [" +
      text.length +
      "] -> { " +
      escapedText +
      " } [" +
      escapedText.length +
      "]"
  );
}

function logRegexMatches(text, regex) {
  const regexMatches = getRegexMatches(text, regex);
  console.log(
    "regexMatches: { " +
      text +
      " } [" +
      text.length +
      "] --- [ " +
      regexMatches +
      " ]"
  );
}

// logEscapeText("test one");
// logEscapeText("test two");
// logEscapeText("test&nbsp;two");

// logRegexMatches("test&nbsp;two", htmlEntityRegex);
// logRegexMatches("test&nbsp;two & ab; for&amp;amp", htmlEntityRegex);
// logRegexMatches("test&nbsp;two & ab; for&amp;amp", ampersandRegex);
// logRegexMatches("test&nbsp;two & ab; for&amp;amp", safeAmpersandRegex);

const period7Bit = "&#46;";
const periodNamed = "&period;";

const good = "&";// /&/g;
const bad = "&#";// /&#/g;


const newestRegex = /(?<!&)#/g;

const goodBadRegex = /&/g; //
// const tempRegex = /(^[#])|((?[^&])[#])/g; // match if is starting # or if is not &#
const tempRegex = /^[#]|((?[^&])[#])/g; // match if is starting # or if is not &#

// logRegexMatches(
//   "test&nbsp;some & thing; for&amp;amp followed & last",
//   safeAmpersandRegex
// );
// logRegexMatches(
//   "test&#46;some & thing; for&#46;amp  followed & last",
//   safeAmpersandRegex
// );

logRegexMatches("", tempRegex);

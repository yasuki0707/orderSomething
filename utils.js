var getTextWithCommas = function(text, showLen, commaLen) {
    const strLen = text.length
    const strShowLen = strLen > showLen ? showLen-commaLen : strLen
    const padLen = Math.min(strLen, showLen)
    
    return text.slice(0,strShowLen).padEnd(padLen,'.')
}

module.exports.getTextWithCommas = getTextWithCommas
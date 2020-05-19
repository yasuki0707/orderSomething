function setUserInfo(userId, obj) {
    if(!global.userInfo) {
        global.userInfo = []
        global.userInfo.push({userId: userId})
        Object.keys(obj).forEach(x=>{
            global.userInfo[global.userInfo.length-1][x] = obj[x]
        })
    } else {
        global.userInfo.some((g,i,arr)=>{
            if(g.userId==userId) {
                Object.keys(obj).forEach(x=>{
                    global.userInfo[i][x] = obj[x]
                })
                return true
            } else if(i==global.userInfo.length-1){
                global.userInfo.push({userId: userId})
                Object.keys(obj).forEach(x=>{
                    global.userInfo[i+1][x] = obj[x]
                })
            }
        })
    }
}

function getUserInfo(userId, prop) {
    if(global.userInfo === undefined) {
        return ""
    } 
    const user = global.userInfo.find(x=>x.userId==userId)
    return user ? user[prop] : ""
}

module.exports.setUserInfo = setUserInfo
module.exports.getUserInfo = getUserInfo

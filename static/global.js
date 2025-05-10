// alert("I'm always on duty!")

// const errordialog_enabled = false

// window.onerror = function(ex,url,line,col,error) {
//     if (!errordialog_enabled) return false
//     alert("Exception occurred.\n"+ex.toString()+"\n"+url+" @ "+line+":"+col+"\n"+error.toString())
//     return true
// }

if (typeof $ === 'undefined') {
    alert("jQuery is not accessible!")
}

function is3DS() {
    var is3ds = window.navigator.userAgent.indexOf("Nintendo 3DS") > -1
    if (is3ds && window.navigator.userAgent.indexOf("New Nintendo 3DS") > -1) {
        return "new"
    } else return is3ds
}

function bool_any(a) {
    var o = false
    a.forEach(function(b) {
        o = o || b
    })
    return o
}

function str_matches_any(s, rs) {
    var o = false
    rs.forEach(function(r) {
        o = o || s.match(r)
    })
    return o
}

function cookies_test(callback) {
    $.post("/cookie/test").always(function() {
        $.get("/cookie/test", function() {
            callback(true)
        }).fail(function() {
            callback(false)
        })
    })
}
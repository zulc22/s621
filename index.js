const port = 80

const express = require('express')
const request = require('request')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')

const app = express()
app.set('view engine', 'pug')

app.use(morgan('combined'))
app.use(cookieParser())
// app.use(express.raw({type: "*/*"}))
app.use(express.urlencoded({extended: false}))

app.use('/static', express.static("static"))

app.get('/', async (req, res) => {
    res.render("index", {postCount: await esix_postCount()})
})

app.get('/favicon.ico', (req,res) => {
    res.status(302).redirect("/static/favicon.ico")
})

app.get('/posts', async (req,res) => {
    var page = parseInt(req.query.page || "1")
    var tags = req.query.tags || ""
    var e6req = await esix_rq("posts.json?"+encodeParams({
        page: page, tags: tags, limit: 16
    }))
    var data = JSON.parse(e6req)
    var settings = app_settings(req)
    res.render("posts", {
        posts: data.posts,
        tags: tags,
        page: page,
        settings: settings
    })
})

app.get('/posts/:id', async (req,res) => {
    var e6req = await esix_rq(`posts/${req.params.id}.json`)
    var data = JSON.parse(e6req)
    var settings = app_settings(req)
    if (data.post.file) {
        var fileurl = data.post.file.url
        var postIsGIF = fileurl.endsWith(".gif")
        var postIsImage =
            fileurl.endsWith(".png") ||
            fileurl.endsWith(".jpg")
        var postImgWidth = data.post.file.width
        var useFile = false
        if (postImgWidth > 320) { 
            if (postIsGIF && settings.postpage_gif_resize == "true") {
                data.post.file.url = `/resized/${req.params.id}.gif`
                useFile = true
            }
            if (postIsImage && settings.postpage_image_resize == "true") {
                data.post.file.url = `/resized/${req.params.id}.png`
                useFile = true
            }
        }
        if (!useFile && settings.proxy_images == "true") {
            data.post.file.url = `/proxy/img/${req.params.id}`
            useFile = true
        }
    }
    res.render("postpage", {...data, useFile: useFile})
})

const filesize = require('file-size')
const sharp = require('sharp')
app.get('/resized/:id.gif', async (req,res) => {
    var key = `resized_${req.params.id}.gif`
    if (myCache.get(key)) {
        res.type("gif")
        res.header("Cache-Control", "max-age=604800")
        res.header("Age", "0")
        res.send(myCache.get(key))
        return
    }
    var e6req = await esix_rq(`posts/${req.params.id}.json`)
    var data = JSON.parse(e6req)
    if (!data.post.file.url.endsWith(".gif")) {
        res.status(400).send("That post isn't a gif")
        return
    }
    res.type("gif")
    res.header("Cache-Control", "max-age=604800")
    res.header("Age", "0")
    var filereq = await ua_rq(data.post.file.url)
    console.log("Downloading gif...")
    if (filereq.headers.get("content-length")) {
        console.log(
            filesize(parseInt(filereq.headers.get("content-length")))
            .human()
        )
    }
    var file = await filereq.bytes()
    console.log("Download finished. Resizing...")
    var outbuf = await sharp(file, {animated:true, limitInputPixels:false})
        .resize(320, null, {kernel: "linear"})
        .gif({ interFrameMaxError: 2, effort: 1,  })
        .toBuffer()
    console.log("Resize finished")
    console.log(filesize(outbuf.length).human())
    myCache.set(key, outbuf)
    res.send(outbuf)
})

app.get('/resized/:id.png', async (req,res) => {
    var key = `resized_${req.params.id}.png`
    if (myCache.get(key)) {
        res.type("png")
        res.header("Cache-Control", "max-age=604800")
        res.header("Age", "0")
        res.send(myCache.get(key))
        return
    }
    var e6req = await esix_rq(`posts/${req.params.id}.json`)
    var data = JSON.parse(e6req)
    res.type("png")
    res.header("Cache-Control", "max-age=604800")
    res.header("Age", "0")
    var filereq = await ua_rq(data.post.file.url)
    console.log("Downloading image...")
    if (filereq.headers.get("content-length")) {
        console.log(
            filesize(parseInt(filereq.headers.get("content-length")))
            .human()
        )
    }
    var file = await filereq.bytes()
    console.log("Download finished. Resizing...")
    var outbuf = await sharp(file, {limitInputPixels:false})
        .resize(320, null)
        .png()
        .toBuffer()
    console.log("Resize finished")
    console.log(filesize(outbuf.length).human())
    myCache.set(key, outbuf)
    res.send(outbuf)
})

app.get('/proxy/img/:id', async (req, res) => {
    var e6req = await esix_rq(`posts/${req.params.id}.json`)
    var data = JSON.parse(e6req)
    req.pipe(request(data.post.file.url)).pipe(res)
})
app.get('/proxy/prev/:id', async (req, res) => {
    var e6req = await esix_rq(`posts/${req.params.id}.json`)
    var data = JSON.parse(e6req)
    req.pipe(request(data.post.preview.url)).pipe(res)
})

app.get('/cookie/mascot', (req, res) => {
    var m = req.cookies.mascot;
    // console.log("Mascot for user is-",m)
    if (m===undefined) {res.send(''); return}
    res.send(m)
})

app.post('/cookie/mascot', (req, res) => {
    var s = req.body.mascot
    res.cookie("mascot", s, {
        maxAge: 60*60*24*7
    })
    res.status(200).send('').end()
    // console.log("Mascot for user set to-",s)
})

app.post('/cookie/test', (req,res) => {
    res.status(200).cookie("testcookie","yeah", {
        maxAge: 60*60*24*7
    }).send('')
})
app.get('/cookie/test', (req,res) => {
    try {
        if (req.cookies.testcookie === "yeah") {
            res.status(200).send('')
        } else {
            res.status(400).send('')
        }
    } catch(_) {
        res.status(400).send('')
    }
})

const app_settings_default = {
    postpage_gif_resize: "true",
    postpage_image_resize: "false",
    proxy_images: "false"
}
function strAsBool(s) {
    var _s = s.toLowerCase().trim()
    return _s === "true"
}

function app_settings(req) {
    var settings = {}
    for (const key in app_settings_default) {
        if (req.cookies[key] !== undefined) {
            settings[key] = req.cookies[key]
        } else {
            settings[key] = app_settings_default[key]
        }
    }
    return settings
}

app.get("/settings", (req,res) => {
    var check_cookies = true
    if (req.cookies.testcookie === "yeah") check_cookies = false
    res.render("settings", {
        check_cookies: check_cookies,
        appsettings: app_settings(req)
    })
})

app.post("/cookie/setting", (req,res) => {
    if (!req.body) {
        res.status(400).send('no body')
        return
    }
    var cookies = {}
    for (const k in req.body) {
        if (!(k in app_settings_default)) {
            res.status(400).send('invalid key '+k)
            return
        }
        cookies[k] = req.body[k]
    }
    res.status(200)
    for (const k in cookies) {
        res.cookie(k, cookies[k], {maxAge: 60*60*24*7})
    }
    res.end()
})

// app.get("/cookie", (req,res) => {
//     res.cookie("test2","yes",{
//         maxAge: 60*60*24*7
//     })
//     res.send('<meta name="viewport" content="width=320"><pre>'+JSON.stringify(req.headers.cookie)+'</pre><br><br><form action="" method="post"><input type="text" name=""><input type="submit"></form>')
// })
// app.post("/cookie", (req,res) => {
//     var s = req.body.toString("utf8")
//     res.cookie("test",s,{
//         maxAge: 60*60*24*7
//     })
//     res.status(302).redirect("/cookie")
// })

app.listen(port, () => {
    console.log(`App listening on port ${port}.`)
})

// debug only
// var livereload = require('livereload');
// var server = livereload.createServer({
//     exts: ["html","css","js","png","gif","jpg","pug"]
// });
// server.watch(__dirname);

const jsdom = require('jsdom')

const e6_host = "https://e621.net/"

const NodeCache = require( "node-cache" );
const myCache = new NodeCache();

async function esix_postCount() {
    var site_post_count = myCache.get("site_post_count")
    if (site_post_count == undefined) {
        myCache.set("site_post_count", 0, 60)
        console.log("Getting post count...")
        var e6_pagedata = await esix_rq("")
        console.log("- Fetch complete")
        // console.log(e6_pagedata)
        var e6_index = new jsdom.JSDOM(e6_pagedata)
        var hfc = e6_index.window.document.body.getElementsByClassName("home-footer-counter")
        var postcount = ""
        for (const el of hfc[0].childNodes) {
            if (el===undefined || el.nodeName!=="IMG") continue
            postcount += el.src.split("/counter/")[1][0]
        }
        console.log("- postcount =",postcount)
        site_post_count = parseInt(postcount)
        myCache.set("site_post_count", site_post_count, ((20*60)+3)*60)
    }
    return site_post_count
}

async function esix_rq(postfix) {
    var key = `req_${postfix}`
    var req = myCache.get(key)
    if (req) return req
    req = await ua_rq(e6_host+postfix)
    if (req.status == 200) {
        var t = await req.text()
        myCache.set(key, t, 60)
        return t
    }
}

async function ua_rq(url) {
    return await fetch(url, {headers: {
        "User-Agent": "s621/0.0 (by jasmagender on e621)"
    }})
}

function encodeParams(params) {
    return Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
}
// esix_postCount()
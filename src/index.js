const { SSR_ENV } = process.env;

const { createProxyMiddleware } = require('http-proxy-middleware')
const express = require('express')
const fs = require('fs')
const Stream = require('stream')
const compression = require('compression')
const request = require('umi-request')
const app = express()
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const { join } = require('path')

const isProd = SSR_ENV === "prod"

const root = join(__dirname, isProd ? '../dist' : '../../itellyou/dist')

const apiUrl = "http://localhost:8082"
const devUrl = "http://localhost:8000"

//设置编辑器公式 api 转发
app.use(createProxyMiddleware('/api/(latex|puml|graphviz|flowchart|mermaid)',{
    target: 'https://g.itellyou.com/',
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
}))
//设置 api 转发
app.use(createProxyMiddleware('/api',{
    target: apiUrl,
    changeOrigin: true,
    pathRewrite: { '^/api': '' }
}))

app.use(cookieParser());
app.use(bodyParser.json({limit: '10mb'}))
app.use(bodyParser.urlencoded({            
    extended: false
}))
app.disable('x-powered-by')
app.use(compression())

if(!isProd){
    //设置资源文件(js,css,png)等转发
    app.use(createProxyMiddleware('**/*.*',{target:devUrl,changeOrigin:true}))
    //设置开发环境相关转发
    app.use(createProxyMiddleware('/dev-server/',{target:devUrl,changeOrigin:true}))
}else{
    app.use(express.static(root,{ index : false }))
}
const extendRequest = request.extend({ timeout:10000 })

const serverRender = require(`${root}/umi.server`)
let serverHtml = isProd ? fs.readFileSync(`${root}/index.html`,'utf-8') : null;

app.use(async ({ url , cookies , headers }, res) => {
    res.setHeader('Content-Type', 'text/html');
    const token = cookies['token'];

    const userResponse = token ? await extendRequest(`${apiUrl}/user/me?token=${token}`) : null
    const userData = userResponse && userResponse.result ? userResponse.data : null

    const settingResponse = await extendRequest(`${apiUrl}/system/setting`)
    const settingData = settingResponse && settingResponse.result ? settingResponse.data : null

    const linkResponse = await extendRequest(`${apiUrl}/system/link`)
    const linkData = linkResponse && linkResponse.result ? linkResponse.data.data : null

    const deviceAgent = headers["user-agent"].toLowerCase();
    const isMobile = deviceAgent.match(/(iphone|ipod|ipad|android|wechat|alipay)/);

    let htmlTemplate = isProd ? serverHtml : null

    if(isProd && settingData && settingData.footer_scripts){
        htmlTemplate = htmlTemplate.replace("</body>",`${settingData.footer_scripts}</body>`);
    }

    const context = {
    };
    const { html, error, rootContainer } = await serverRender({
        // 有需要可带上 query
        path: url,
        context,
    
        // 可自定义 html 模板
        htmlTemplate,
    
        // 启用流式渲染
        mode: 'stream',
    
        // html 片段静态标记（适用于静态站点生成）
        // staticMarkup: false,
    
        // 扩展 getInitialProps 在服务端渲染中的参数
        getInitialPropsCtx: {
            user:userData,
            site:settingData,
            links:linkData,
            isMobile,
            params:{
                token,
                api_url:apiUrl,
                headers
            }
        },
        //manifest
    });
    
    if(error){
        console.error(error)
    }
    // support stream content
    if (html instanceof Stream) {
        html.pipe(res);
        html.on('end', function() {
            res.end();
        });
    } else {
        res.send(html);
    }
})
const appPORT = process.env.PORT || 8088
app.listen(appPORT, () => console.log(`ITELLYOU SSR listening on port ${appPORT}!`))
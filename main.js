const express = require('express'),
    app = express(),
    router = express.Router(),
    bodyParser = require('body-parser'); // 解析请求的body中的内容[必须]

app.use(express.static('public'));
//app.use('/api', router);//访问每个接口前边都需要加上(api/)(eg：http://localhost:3000/api/students)

app.listen(8080, 
    () => console.log('Example app listening on port 8080!'));
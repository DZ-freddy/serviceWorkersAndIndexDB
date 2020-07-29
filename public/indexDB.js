class DB{
    constructor(dbObject){
        this.name=dbObject.name;
        this.version=dbObject.version;
        this.objstore=dbObject.ojstore;
        this.indexDB=window.indexedDB||window.webkitindexedDB;

        // 这里可以定义或者传入一些函数么？,他在new的时候就已经自动打开了数据库，但是这里是无法进行promise操作的

        // this.request=this.indexDB.open(this.name,this.version)
        // this.db()
        // 这里加函数其实还是没什么用，怎么说他都是异步的，如果可以在这个里面加一个回调函数，那么就可以了，但是实际上那不就是把后面的每次打开的部分加到这个里面了吗，也不是最优雅的方式
    }

    // 其实就是对应indexDB的对象来封装一些这个里面使用的对象
    
    // 打开数据库，其实这个可以做到上面的constructor里面，或者下面db()函数里面
    async open(){
        return new Promise((resolve,reject)=>{
            const request=this.indexDB.open(this.name,this.version)

            request.onerror=(e)=>{
                console.log('打开数据库失败')
                reject({type:'error'})
            }
            
            request.onsuccess=(e)=>{
                console.log('打开成功')
                // console.log(request)
                resolve({type:'success',obj:e.target.result})
            }
            request.onupgradeneeded=(e)=>{
                let objStore
                if(!e.target.result.objectStoreNames.contains(this.objstore.name)){
                    objStore=e.target.result.createObjectStore(this.objstore.name,{keyPath:"id"})
                    // get其实是这个keyPath的值
                    objStore.createIndex('name','name',{unique:false})
                    objStore.createIndex('email','email',{unique:true})
                }
                console.log('升级数据库')
                resolve(e)            
            }
        })
    }
    // 返回当前数据库的实体，之后的函数使用这个
    async db(){
        return new Promise((resolve,reject)=>{
            let request=this.indexDB.open(this.name,this.version)
            request.onerror=(e)=>{
                reject({type:"error"})
            }
            request.onsuccess=(e)=>{
                // 我在第一次open的
                resolve(e.target.result)
            }
        })
    }

    async transaction(writeable=false){
        let mode=writeable?'readwrite':'readonly'
        return new Promise((resolve,reject)=>{
            this.db().then((e)=>{
                const transaction=e.transaction([this.objstore.name],mode).objectStore(this.objstore.name)
                resolve(transaction)
            },(e)=>{
                reject('进行到了transaction')
            })
        })
    }
    // 关掉数据库
    async close(){
        return this.db().then((e)=>{
            e.close().then((e)=>{
                console.log('1')
            })
            return {type:'success'}
        })
    }
    async add(value){
        return new Promise((resolve,reject)=>{
            this.transaction('readwrite').then((e)=>{
                let re=[]
                for(let i=0;i<value.length;i++){
                    let pr=new Promise((resolve,reject)=>{
                        const request=e.add(value[i])
                        request.onsuccess=(e)=>{
                            resolve(('ok'))
                        }
                        request.onerror=(e)=>{
                            reject('插入失败')
                        }
                    })
                    re.push(pr)
                }
                Promise.all(re).then((e)=>{
                    resolve('ok')
                },(e)=>{
                    reject('no')
                })
                
            })
        })  
    }
    readId(index){
        return new Promise((resolve,reject)=>{
            this.db().then((e)=>{
                const transaction=e.transaction([this.objstore.name]).objectStore(this.objstore.name)
                let re=transaction.get(index)
                re.onsuccess=(e)=>{
                    resolve(e.target.result)
                }
                re.onerror=(e)=>{
                    console.log(e)
                }
            })
        })
    }
    
    async readAll(){
        return new Promise((resolve,reject)=>{
            // 其实这个还是每次打开一次，并不是定义的时候就打开，然后把打开那个值存起来。不过其实总的都是open，只不过是open一次还是open几次的区别罢了
            this.transaction().then((e)=>{
                let re=[]
                e.openCursor().onsuccess=(e)=>{
                    let cursor=e.target.result;
                    if(cursor){
                        re.push(cursor.value)
                        cursor.continue()
                    }else{
                        resolve({typpe:'success',result:re})
                    }
                }
                e.openCursor().onerror=(e)=>{
                    reject({type:'error'})
                }
            })
        })
    }

    async readNameIndex(name){
        return new Promise((resolve,reject)=>{
            this.transaction().then((e)=>{
                // console.log(e.indexNames)
                const re=e.index('name').get(name)
                re.onsuccess=(e)=>{
                    let result=e.target.result
                    if(result){
                        resolve({type:'success',result:result})
                    }else{
                        reject({type:'error'})
                    }                     
                }
                re.onerror=(e)=>{
                    reject({type:'error'})
                }

            })
        })
    }

    async put(value){
        return new Promise((resolve,reject)=>{               
            // 根据上面定义的东西要先检查一下数据的格式是否规范，可以执行put方法
            this.transaction('readwrite').then((e)=>{
                const re=e.put(value)

                re.onerror=(e)=>{
                    reject({type:'error',msg:'数据更新失败'})
                }

                re.onsuccess=(e)=>{
                    this.readId(value.id).then((e)=>{
                        resolve({type:'ok',msg:'数据更新成功',result:e})
                    })                        
                }
            })
        })
    }

    async deleteIndex(index){
        // 首先要确认数据库里面有这个数据
        return new Promise((resolve,reject)=>{
            this.transaction('readwrite').then((e)=>{
                const re=e.delete(index)
                re.onsuccess=()=>{
                    resolve({type:'success'})
                }

                re.onerror=()=>{
                    reject({type:'error'})
                }
            })
        })
    }

}   

// 使用
// var myDB={
//     name:'testDB',
//     version:1,
//     db:null,
//     ojstore:{
//         name:'customer',//存储空间表的名字
//         keypath:'id'//主键
//     }
// };
//let db=new DB(myDB)

// db.transition().then((e)=>{
//     console.log(e)
// })
// 获取事物,以及objectStore对象，对象仓库
// 这样使用的话还是不能保证顺序

// 添加属性，支持数组添加
// db.add([{name:'li5',age:20,email:"842323422@qq.com",id:1},{name:'li4',id:2}]).then((e)=>{
//     console.log(e)
// },(e)=>{
//     console.log(e)
// })

// 根据主键进行查找
// db.readId(2).then((e)=>{
// 读取主键定义的值，比如拿电话号定为主键
//     console.log(e)
// })

// 遍历所有存储的属性
// db.readAll().then((e)=>{
//         console.log(e)
// }) 

// 更新一个值
// db.put({ id: 1, name: '李四', age: 35, email: 'lisi@example.com' }).then((e)=>{
//     console.log(e)
// })

// 删除一个值
// db.deleteIndex(1).then((e)=>{
//     console.log(e)
// })

// 从索引搜索数据，不加索引只能从主键搜索
// db.readNameIndex('李四').then((e)=>{
//     console.log(e)
// },(e)=>{
//     console.log('error')
// })


// db.close().then((e)=>{
//     console.log(e)
//     console.log(db)
// })
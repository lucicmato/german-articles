const mongoose = require('mongoose');
const colors = require('colors')

require('dotenv').config();

exports.connect = () =>{
    // MongoDB's connection
    mongoose.connect(process.env.MONGO_URL,{useNewUrlParser: true,
        useUnifiedTopology: true} ).then(() => console.log(colors.green('Database Connected Successfully')))
        .catch((error) => {
        console.log(colors.red.underline('Database Connection Fail'));
        confirm.error(error);
        process.exit(1);
    });
}
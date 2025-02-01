const mongoose =  require("mongoose");

const Noun = new mongoose.Schema({
    id: {
        type: Number,
        required: true
    },
    article: {
        type: String,
        required: true
    },
    noun: {
        type: String,
        required: true
    },
    translation: {
        type: String,
        required: true
    }
},{
    collection: 'Noun'
});


module.exports = mongoose.model('Noun', Noun);
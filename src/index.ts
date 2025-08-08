import dotenv from 'dotenv'
dotenv.config();
import express from 'express';
import type { Request , Response } from 'express';
const app = express();


app.get('/', (req : Request , res : Response) => {

    res.send("everthing is working fine")
})
const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
    console.log("Server is running on Port Number : ",PORT)
})

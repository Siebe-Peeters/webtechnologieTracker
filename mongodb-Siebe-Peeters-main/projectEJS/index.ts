import express from "express";
import session from "express-session";
import { Collection, MongoClient } from "mongodb";
import dotenv from "dotenv";
import { User, Expense, budget, CardDetails, PaymentMethod} from "./Interfaces/user";
import bcrypt from "bcrypt";

const uri = "mongodb+srv://peeterssiebe04:webontwikkeling123@webontwikkeling.mshh9.mongodb.net/"; // Fill in your MongoDB connection string here
const client = new MongoClient(uri);

const app = express();
app.set("view engine", "ejs");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended:true}))
dotenv.config();
app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
}));
declare module "express-session" {
    interface SessionData {
      userId: string;
    }
}

// req.session.userId staan foutmeldingen bij maar dit is omdat we michien een null sturen en dit kan niet in een string aangezien dit een parameter is die je moet meegeven in sommige gevallen 

app.get("/", async(req,res) =>{
   res.redirect("/login"); 
});

app.get("/login", async (req, res) => {
    if (req.session.userId != null) {
        res.render("home");
    }
    else{
        res.render("login", { error: null });
    }
    
});

app.post("/login", async (req, res) => {
    let { email, password } = req.body;
    let user = await collection.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user.id;
        return res.render("home");
    }
    res.render("login", { error: "Email of wachtwoord is fout" });
});

app.get("/register", async (req, res) => {
    if (req.session.userId) {
        return res.render("home");
    }
    res.render("register", { error: null });
});

app.post("/register", async (req, res) => {
    const {  name, email, password } = req.body;
    if (await collection.findOne({ email })) {
        return res.render("register", { error: "Email bestaat al" });
    }
    else {
        const hashedPassword = await bcrypt.hash(password, 10);
        await collection.insertOne({
        id: `user${Date.now()}`,
        name,
        email,
        password: hashedPassword,
        expenses: [],
        budget: { monthlyLimit: 0, notificationThreshold: 0.8, isActive: false },
     });
    }
  res.redirect("/login");
});

app.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});


app.get("/bekijken/:sort", async(req,res) =>{
    let sort : number = parseInt(req.params.sort)
   let user = await generateExpences(req.session.userId);

   if (user == null) {
    return res.redirect("/login");
   }
   else{
    res.render("bekijken", { expenses: user.expenses , sort : sort});
   }
});

app.post("/bekijken/zoek", async(req,res) =>{
    let tag = req.body.zoeken
    let user = await generateExpences(req.session.userId)

    if (user == null) {
        return res.redirect("/login");
    }
    else{
        //kan enkel 1 transactie zoeken als er meerdere met zelfde tag zijn geeft het de eerste terug dat die vind 
        user.expenses.forEach(element => {
        if (element.description === tag) {
            res.render("zoek", {expense : element})
        }});
    } 
});


app.get("/toevoegen", (req,res) =>{
    res.render("toevoegen")
});

app.post("/toevoegen", async (req,res) =>{

    let user = await generateExpences(req.session.userId)
    if (user == null) {
        return res.redirect("/login");
    }
    let id : number = parseInt(req.body.id)

    // ID automatich berekenen
    if (id == 0) {
        let i: number = 1;
        // bekijken hoeveel exspenser er al zijn om Id te kunnen weten
        user.expenses.forEach(() => {
            i = i + 1;
        });
        id = i;
    }
   

    let isIncoming =  req.body.isIncoming;
    let amount : number = req.body.amount;
    let description : string = req.body.description;
    let date : Date = req.body.date;
    let currency : string = req.body.currency;
    let methode : string = req.body.methode;
    let cardNumber : number = req.body.cardNumber;
    let expiryDate = req.body.expiryDate;
    let bankAccountNumber : string = req.body.bankAccountNumber;
    let category : string = req.body.category;
    let isPaid = req.body.isPaid;

    if (isIncoming == "storting") {
        isIncoming = true;
    }
    else{
        isIncoming = false;
    }

    if (isPaid === "ja") {
        isPaid = true
    }
    else{
        isPaid = false
    }

    const cardDetails : CardDetails ={
        cardNumber: cardNumber,
        expiryDate: expiryDate,
    }

    const paymentMethod : PaymentMethod ={
        method: methode,
        cardDetails: cardDetails,
        bankAccountNumber: bankAccountNumber,
    }

    const expense : Expense ={
        id : id,
        description : description,
        amount: amount,
        date: date,
        currency: currency,
        paymentMethod: paymentMethod,
        isIncoming: isIncoming,
        category: category,
        isPaid: isPaid,
    }

    addExpense(user.id ,expense)
    
    res.render("home")
});

app.post("/:id/delete", async(req, res) => {
    let user = await generateExpences(req.session.userId)
    if (user == null) {
        return res.redirect("/login");
    }
    let id : number = parseInt(req.params.id);
    await deleteExpense(user.id,id);
    res.redirect("/bekijken/0");
});


app.post("/:id/update", async(req, res) => {
    let user = await generateExpences(req.session.userId);
    if (user == null) {
        return res.redirect("/login");
    }
    let id : number = parseInt(req.params.id);
    await deleteExpense(user.id,id);
    user.expenses.forEach(element => {
        if (element.id == id) {
             res.render("update", {expense : element});
        }
    });
   
});


app.listen(3000, async() => {
    await connect();
    console.log("Server is running on port 3000");
});


//functies
const collection : Collection<User> = client.db("Project").collection<User>("Users");

async function connect(){
    try {
        await client.connect();  
        console.log("Connected to database");
        process.on("SIGINT", exit);
    } catch (error) {
        console.error(error);
    } 
}

async function exit() {
    try {
        await client.close();
        console.log("Disconnected from database");
    } catch (error) {
        console.error(error);
    }
    process.exit(0);
}

async function generateExpences(userId: string){
    return await collection.findOne({ id: userId });
}

async function addExpense(userId: string, expense: Expense) {
    return await collection.updateOne({ id: userId }, { $push: { expenses: expense } });
}

async function deleteExpense(userId : string, idExpense : number){
    return await collection.updateOne({ id: userId }, { $pull: { expenses: { id: idExpense } } });
}


const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const dotenv = require("dotenv").config()
const Stripe = require('stripe')

const app = express()
app.use(cors())
app.use(express.json({limit : "10mb"}))

const PORT = process.env.PORT || 8080

//CONNEXION A LA BDD
console.log(process.env.MONGODB_URL)
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGODB_URL)
.then(()=>console.log("Connect to Database"))
.catch((err)=>console.log(err))

//schema du users
const userSchema = mongoose.Schema({
    nom : String,
    prenom : String,
    email : {
        type : String,
        unique : true,
    },
    mdp : String,
    confirmmdp: String,
    image: String, 
})

const userModel = mongoose.model("user",userSchema)

//API
app.get("/",(req, res)=>{
    res.send("Server is running")
})

// API sinscrire
app.post("/Sinscrire", async (req, res) => {
    console.log(req.body);
    const { email } = req.body;
  
    try {
      const result = await userModel.findOne({ email: email });
      console.log(result);
  
      if (result) {
        res.send({ message: "Votre email est déjà enregistré", alert : false});
      } else {
        const data = userModel(req.body);
        const save = await data.save();
        res.send({ message: "Enregistré avec succès", alert : true});
      }
    } catch (err) {
      console.log(err);
      res.status(500).send({ message: "Erreur lors de la recherche de l'utilisateur" });
    }
  });
  
// API login
app.post("/login", async(req, res) => {
  try {
    console.log(req.body);
    const { email } = req.body;
    const result = await userModel.findOne({ email: email }).exec();

    if (result) {
      //console.log(result);
      const dataSend = {
        _id: result._id,
        nom: result.nom,
        prenom: result.prenom,
        email: result.email,
        image: result.image,
      };
      console.log(dataSend)
      res.send({ message: "Connecté avec succès", alert: true ,data : dataSend });
    } else {
      res.status(404).json({ message: 'Votre email est invalide, créer un compte', alert : false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la connexion' });
  }
});




/* PRODUITS */

//Schema
 const schemaProduct = mongoose.Schema({
    nom : String,
    description : String,
    categories : String,
    prix : String,
    image : String,
 });

 const productModel = mongoose.model("product", schemaProduct)

 //enregistrer un produit dans la bdd 
 //api

 app.post("/uploadProduct", async (req, res) => {
  try {
    console.log(req.body);
    const data = await productModel(req.body)
    const datasave = await data.save()
    res.send({ message: "Importer avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Une erreur s'est produite lors du traitement de la requête" });
  }
});

//Creer une route produit

app.get("/produit", async (req, res) => {
  try {
    const data = await productModel.find({});
    res.send(JSON.stringify(data));
  } catch (error) {
    console.error(error);
    res.status(500).send("Une erreur s'est produite lors de la récupération des produits.");
  }
});
/** Paiement  */

console.log(process.env.STRIPE_SECRET_KEY)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)


app.post("/create-checkout-session",async(req,res)=>{

     try{
      const params = {
          submit_type : 'pay',
          mode : "payment",
          payment_method_types : ['card'],
          billing_address_collection : "auto",
          shipping_options : [{shipping_rate : "shr_1NFuaKSJQpb2OiHYHyRSZ1e3"}],

          line_items : req.body.map((item)=>{
            return{
              price_data : {
                currency : "inr",
                product_data : {
                  nom : item.nom,
                  // images : [item.image]
                },
                unit_amount : item.price * 100,
              },
              adjustable_quantity : {
                enabled : true,
                minimum : 1,
              },
              quantity : item.qty
            }
          }),

          success_url : `${process.env.FRONTEND_URL}/success`,
          cancel_url : `${process.env.FRONTEND_URL}/cancel`,

      }

      
      const session = await stripe.checkout.sessions.create(params)
      // console.log(session)
      res.status(200).json(session.id)
     }
     catch (err){
        res.status(err.statusCode || 500).json(err.message)
     }

})






app.listen(PORT,()=>console.log("Server is running at port : " + PORT))
const express = require("express");
const mysql = require('mysql');
const cors = require('cors')
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");
const { format } = require('date-fns');
const path = require("path");
const { id } = require("date-fns/locale");
// importing dotenv package and loading environment varialbles
require('dotenv').config();

// creating an instance for express
const app = express();

// adding middlewares to the app
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({extended:true}));

const dbHost = process.env.DATABASE_HOST;
const dbUser = process.env.DATABASE_USER;
const dbPassword = process.env.DATABASE_PASSWORD;
// Create a MySQL connection pool
const pool = mysql.createPool({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: 'ordernow',
    connectionLimit : 10
  });

  // sample connection to mysql db
  app.get('/', (req, res) => {
    // Use the pool to query the database
    pool.query('SELECT * FROM users', (error, results) => {
      if (error) {
        console.error('Error querying the database:', error);
        res.status(500).send('Error querying the database');
      } else {
        res.json(results);
      }
    });
  });

  // registering user 
  app.post('/user-register', async (request, response) => {
    try {
        const {
            username,
            password,
            first_name,
            last_name,
            city,
            email,
            father_name,
            country,
            state,
            phonenumber,
            age,
            user_image_url,
            gender
        } = request.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const userExistsQuery = `
            SELECT * FROM users
            WHERE username = '${username}' OR email = '${email}' OR phonenumber = '${phonenumber}';
        `;

        //fetching is user already registered or not
        await pool.query(userExistsQuery, async(error, results)=>{
            if (error) {
                console.error('Error querying the database:', error);
                response.status(500);
                response.send({"error_msg" : 'Error querying the database'});
            } else {
                if(results?.length === 0){

                    const insertUserQuery = `
                    INSERT INTO users (username, first_name, last_name, phonenumber, email, password, age, father_name, city, country, state, user_image_url, gender)
                    VALUES (
                        '${username}',
                        '${first_name}',
                        '${last_name}',
                        '${phonenumber}',
                        '${email}',
                        '${hashedPassword}',
                        ${age},
                        '${father_name}',
                        '${city}',
                        '${country}',
                        '${state}',
                        '${user_image_url}',
                        '${gender}'
                    );
                `;
                // registering new user
                 await pool.query(insertUserQuery, (error, results)=>{
                    if (error) {
                        console.error('Error querying the database:', error);
                        response.status(500);
                        response.send({"error_msg" : 'Error querying the database'});
                      }else{
                        console.log("new user created : ", results);
                        response.status(201);
                        response.send({"success_msg": "User registered"});
                      } 

                 });
                }else{
                    
                    const usernameAlreadyUsed = results.some(user=>user.username===username);
                    const emailAlreadyUsed = results.some(user=>user.email === email);
                    const phonenumberAlreadyUsed = results.some(user=>user.phonenumber === phonenumber);
                    
                    if(usernameAlreadyUsed && emailAlreadyUsed && phonenumberAlreadyUsed){
                        response.status(400);
                        response.send({"error_msg": `user already exists with same username-${username}, email-${email} and phone number-${phonenumber}`});
                    }else if(usernameAlreadyUsed && emailAlreadyUsed){
                        response.status(400);
                        response.send({"error_msg": `user already exists with same username-${username} and email-${email}`});

                    }else if(usernameAlreadyUsed && phonenumberAlreadyUsed){
                        response.status(400);
                        response.send({"error_msg": `user already exists with same username-${username} and phone number-${phonenumber}`});

                    }else if(emailAlreadyUsed && phonenumberAlreadyUsed){
                        response.status(400);
                        response.send({"error_msg": `user already exists with same email-${email} and phone number-${phonenumber}`});
                    }else if(usernameAlreadyUsed){
                        response.status(400);
                        response.send({"error_msg": `user already exists with same username-${username}`});
                    }else if(emailAlreadyUsed){
                        response.status(400);
                        response.send({"error_msg": `user already exists with same email-${email}`});
                    }else if(phonenumberAlreadyUsed){
                        response.status(400);
                        response.send({"error_msg": `user already exists with same phone number-${phonenumber}`});
                    }
  
                }
              }
        });
    
    } catch (e) {
        console.log(`Error When Registering the User ${e.message}`);
        response.status(500);
        response.send({"error_msg": "Internal Server Error!"});
    }
});

// login with the user credintials and getting jwt token

app.post('/user-login',async(request,response)=>{
    try{
        const {username, password} = request.body;
        // fetching user details
        const fetchUserDetailsQuery = `
            SELECT * FROM users
            WHERE  username = '${username}';
        `;
        await pool.query(fetchUserDetailsQuery, async (error, results)=>{
            if(error){
                console.error('Error querying the database:', error);
                response.status(500);
                response.send({"error_msg" : 'Error querying the database'});

            }else{
                if(results?.length === 0){
                    response.status(401);
                    response.send({"error_msg":"Invalid username"});
                }else{
                    const requestedUser = results[0];
                    const isPasswordMatched =await bcrypt.compare(password, requestedUser.password);
                    if(isPasswordMatched){
                        const payload = {
                            "username":username,
                            "id" : requestedUser.id
                        }
                        const jwtToken = jwt.sign(payload, "SET_PRODUCTION_SECRET_KEY_HERE");
                        response.send({ jwtToken });
                    }else{
                        response.status(401);
                        response.send({"error_msg":"Invalid Password"});

                    }
                }
            }
        })
        
    }catch(e){
        console.log(`Error When Registering the User ${e.message}`);
        response.status(500); 
        response.send({"error_msg": "Internal Server Error!"});

    }
});

// creating a middleware for authentication
const authenticateToken = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
      response.status(401);
      response.send({"error_msg":"Invalid JWT Token"});
    } else {
      jwt.verify(jwtToken, "SET_PRODUCTION_SECRET_KEY_HERE", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send({"error_msg":"Invalid JWT Token"});
        } else {
          request.username = payload.username;
          request.id = payload.id;
          next();
        }
      });
    }
  };

// adding new restaurant 
app.post('/create-restaurant',authenticateToken,async (request,response)=>{
    try{
        const {restaurant_name, restaurant_type, restaurant_location, restaurant_image_url} = request.body
        const username = request.username 

        const fetchRestaurantsQuery=`
            SELECT * FROM restaurants WHERE 
            UPPER(restaurant_name) LIKE UPPER('${restaurant_name}');
        `;
        // checking restaurant already exists or not
        pool.query(fetchRestaurantsQuery, async(error, restaurantsList)=>{
            if(error){
                console.error('Error querying the database:', error);
                response.status(500);
                response.send({"error_msg" : 'Error querying the database'});
            }else{
                if(restaurantsList?.length === 0){
                    const userDetailsQuery = `
                    SELECT * FROM users
                    WHERE username = '${username}';
                `;
            
                //fetching user details
                 pool.query(userDetailsQuery, async(error, userDetailsList)=>{
                    if (error) {
                        console.error('Error querying the database:', error);
                        response.status(500);
                        response.send({"error_msg" : 'Error querying the database'});
                    } else {
                        const userDetails = userDetailsList[0]
                        
                        const createNewRestaurantQuery = `
                            INSERT INTO 
                                restaurants (
                                            restaurant_name,
                                            restaurant_type, 
                                            restaurant_location,
                                            restaurant_owner,
                                            restaurant_image_url
                                            )
                                    VALUES (
                                            '${restaurant_name}',
                                            '${restaurant_type}',
                                            '${restaurant_location}',
                                            ${userDetails.id},
                                            '${restaurant_image_url}'
                                    );
                        `;
            
                        pool.query(createNewRestaurantQuery, (error, results)=>{
                            if(error){
                                console.error('Error querying the database:', error);
                                response.status(500);
                                response.send({"error_msg" : 'Error querying the database'});
                            }else{
                                response.status(201);
                                response.send({"success_msg":"Restaurant created successfully!"});
                            }
                        });
                    }
                });

                }else{
                    response.status(400);
                    response.send({"error_msg":"restaurant already exists with same restaurant name!"});
                }

            }
        })
 

    }catch(e){
        console.log(`Error When Registering the User ${e.message}`);
        response.status(500); 
        response.send({"error_msg": "Internal Server Error!"});
    }
});

// updating restaurant details
app.put('/update-restaurant/:restaurantId', authenticateToken, async (request, response)=>{
    try{
        
        console.log('==='.repeat(15),'\n',`restaurant details updating.......`)
        console.log('==='.repeat(15))
        const {restaurantId} = request.params 
        const {
            restaurant_name ,
             restaurant_type,
             restaurant_location,
             restaurant_image_url
        } = request.body

        const username = request.username;
        const fetchRestaurantDetailsQuery= `
           SELECT * FROM restaurants 
           WHERE restaurant_id LIKE '${restaurantId}' AND restaurant_owner = ${request.id};
        `;
        pool.query(fetchRestaurantDetailsQuery, async(error, restaurantDetails)=>{
            if(error){
                console.error('Error querying the database:', error);
                response.status(500);
                response.send({"error_msg" : 'Something went wrong,when querying the restaurant details.'});
            }else{
                if(restaurantDetails?.length === 0 || restaurantDetails === undefined){
                    response.status(400);
                    response.send({"error_msg" : 'Only Authorized user can update details'})
                }else{
                    const updatedRestaurantName = restaurant_name === undefined || restaurant_name?.trim?.length === 0 ? restaurantDetails[0].restaurant_name: restaurant_name ;
                    const updatedRestaurantType = restaurant_type === undefined || restaurant_type?.trim?.length === 0 ? restaurantDetails[0].restaurant_type: restaurant_type ;
                    const updatedRestaurantLocation = restaurant_location === undefined || restaurant_location?.trim?.length === 0 ? restaurantDetails[0].restaurant_location: restaurant_location ;
                    const updatedRestaurantImageUrl = restaurant_image_url === undefined || restaurant_image_url?.trim?.length === 0 ? restaurantDetails[0].restaurant_image_url: restaurant_image_url ;

                    const updatedRestaurantDetailsQuery = `
                        UPDATE restaurants
                        SET restaurant_name = '${updatedRestaurantName}',
                            restaurant_type = '${updatedRestaurantType}',
                            restaurant_location = '${updatedRestaurantLocation}'
                        WHERE 
                            restaurant_id = ${restaurantId} AND 
                            restaurant_owner = ${request.id}
                    `;

                    pool.query(updatedRestaurantDetailsQuery, async(error, updatedResult)=>{
                        if(error){
                            console.error('Error querying the database:', error);
                            response.status(500);
                            response.send({"error_msg" : 'Something went wrong,when updating the restaurant details.'})
                        }else{
                            if(updatedResult === undefined){
                                response.status(400);
                                response.send({"error_msg":"something went wrong, when updating the restaurant details"});
                            }else{
                                console.log(` user ${request.username} updated ${restaurantDetails[0].restaurant_name}`)
                                console.log('==='.repeat(15))
                                response.send({"success_msg":"updated successfully"});
                            }
                        }
                    });
                    
                }
            }
        });
        
    }catch(e){
        console.log(`Error When Registering the User ${e.message}`);
        response.status(500); 
        response.send({"error_msg": "Internal Server Error!"});
    }
});

// deleting restaurant details
app.delete('/delete-restaurant/:restaurantId', authenticateToken, async(request, response)=>{
    try{
        const {restaurantId} = request.params;
        const deleteRestaurantQuery = `
            DELETE FROM restaurants 
            WHERE restaurant_id = ${restaurantId} AND restaurant_owner = ${request.id};
        `;
        pool.query(deleteRestaurantQuery, async (error, results)=>{
            if(error){
                console.error('Error querying the database:', error);
                response.status(500);
                response.send({"error_msg" : 'Something went wrong,when querying the restaurant details.'});
            }else{
                response.send({"success_msg":"Restaurant details deleted successfully."})
            }
        });

    }catch(e){
        console.log(`Error When Registering the User ${e.message}`);
        response.status(500); 
        response.send({"error_msg": "Internal Server Error!"});
    }
});

// get restaurant details

// adding menu items


// update menu items

// delete menu items

// get menu items

// getting all the restaurant details





app.listen(3500,()=>{
    console.log(`server running on http://localhost:3500`)
});

module.exports = app;
const express = require("express");
const mysql = require('mysql');
const cors = require('cors')
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");
const { format } = require('date-fns');
const path = require("path");
const { id } = require("date-fns/locale");
const { error } = require("console");
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
        console.log('==='.repeat(15),'\n',`${username} is registering...`)
        console.log('==='.repeat(15))
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
                    const updatedUserImageUrl = user_image_url === undefined || user_image_url?.trim?.length === 0 ? process.env.USER_IMAGE_URL : user_image_url;
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
                        '${updatedUserImageUrl}',
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
        console.log('==='.repeat(15),'\n',`${username} is trying to login...`)
        console.log('==='.repeat(15))
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
                        console.log('==='.repeat(15),'\n',`login successfull and store your jwtToken`)
                        console.log('==='.repeat(15))
                        response.send({ jwtToken });
                    }else{
                        console.log('==='.repeat(15),'\n',`invalid password, login failed.......`)
                        console.log('==='.repeat(15))
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
        console.log('==='.repeat(15),'\n',`new restaurant adding.......`)
        console.log('==='.repeat(15))
        const {restaurant_name, restaurant_type, restaurant_location, restaurant_image_url, restaurant_rating} = request.body
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
                        const updatedRestaurantImageUrl = restaurant_image_url === undefined || restaurant_image_url?.trim?.length === 0 ? process.env.RESTAURANT_IMAGE_URL: restaurant_image_url ;
 
                        const createNewRestaurantQuery = `
                            INSERT INTO 
                                restaurants (
                                            restaurant_name,
                                            restaurant_type, 
                                            restaurant_location,
                                            restaurant_owner,
                                            restaurant_image_url,
                                            restaurant_rating
                                            )
                                    VALUES (
                                            '${restaurant_name}',
                                            '${restaurant_type}',
                                            '${restaurant_location}',
                                            ${userDetails.id},
                                            '${updatedRestaurantImageUrl}',
                                            ${restaurant_rating}
                                    );
                        `;
            
                        pool.query(createNewRestaurantQuery, (error, results)=>{
                            if(error){
                                console.error('Error querying the database:', error);
                                response.status(500);
                                response.send({"error_msg" : 'Error querying the database'});
                            }else{
                                console.log('==='.repeat(15),'\n',`restaurant added successfully!`)
                                console.log('==='.repeat(15))
                                response.status(201);
                                response.send({"success_msg":"Restaurant added successfully!"});
                            }
                        });
                    }
                });

                }else{
                    console.log('==='.repeat(15),'\n',`restaurant not added`)
                    console.log('==='.repeat(15))
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
             restaurant_image_url,
             restaurant_rating
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
                    const updateRestaurantRating = restaurant_rating > 0 ? restaurant_rating : 0
                    const updatedRestaurantDetailsQuery = `
                        UPDATE restaurants
                        SET restaurant_name = '${updatedRestaurantName}',
                            restaurant_type = '${updatedRestaurantType}',
                            restaurant_location = '${updatedRestaurantLocation}',
                            restaurant_rating = ${updateRestaurantRating}
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
        console.log('==='.repeat(15),'\n',`user-${request.username} is trying to delete the restaurant....`)
        console.log('==='.repeat(15))
        const {restaurantId} = request.params;
        // check restaurant exists with the given restaurant id then proceed for deletion

        const checkRestaurantIdExistsQuery = `
            SELECT * FROM restaurants 
                WHERE restaurant_id = ${restaurantId};
        `;

        pool.query(checkRestaurantIdExistsQuery, async(error, restaurantsDetails)=>{
            if(error){
                console.error('Error querying the database:', error);
                response.status(500);
                response.send({"error_msg" : 'Something went wrong,when querying the restaurant details.'});
            }else{
                if(restaurantsDetails?.length>0){
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
                    console.log(results)
                    console.log('==='.repeat(15),'\n',`user-${request.username} is deleted restaurant : ${restaurantsDetails[0].restaurant_name} successfully!`)
                    console.log('==='.repeat(15))
                    response.send({"success_msg":"Restaurant details deleted successfully."})
                }
            });
        }else{
            console.log('==='.repeat(15),'\n',`restaurant not exists...`)
            console.log('==='.repeat(15))
            response.status(400);
            response.send({"error_msg":"Restaurant not exists"});
        }

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
app.post('/create-menu-item', authenticateToken, async(request, response)=>{
    try{
        console.log('==='.repeat(15),'\n',`menu item adding.......`)
        console.log('==='.repeat(15))
        const {
            item_name,
            item_price,
            item_availability,
            item_image,
            item_description,
            item_discount,
            item_type,
            restaurant_id,
            item_rating
        } = request.body;
        const item_added_by = request.id;
        //check duplicate items in restaurants then add new item
        const itemExistsQuery =`
            SELECT * FROM menu
            WHERE item_name LIKE '${item_name}' AND restaurant_id = ${restaurant_id};
        `;
        pool.query(itemExistsQuery, async(error, existingDuplicateItemsList)=>{
            if(error){
                console.error('Error querying the database:', error);
                response.status(500);
                response.send({"error_msg" : 'Something went wrong,when querying the restaurant item details.'});
            }else{
                if(existingDuplicateItemsList?.length > 0){
                    console.log('==='.repeat(15),'\n',`item not added`)
                    console.log('==='.repeat(15))
                    response.status(400);
                    response.send({"error_msg":"item name already exists in the same restaurant, try with a different name."})
                }else{
                    const updatedItemName = item_name?.trim()?.length > 0 && item_name !== undefined ? item_name : "item";
                    const updatedItemPrice = item_price > 0 ? item_price : 0
                    const updatedItemAvailability = (typeof(item_availability) === "boolean" && item_availability === true ) || (typeof(item_availability)=== "string" && item_availability?.toLowerCase() === "available") ? true : false;
                    const updatedItemImage = item_image?.trim().length > 0 && item_image !== undefined && item_image?.startsWith("https://")? item_image : process.env.MENU_ITEM_IMAGE_URL;
                    const updatedItemDescription = item_description?.trim().length > 0 && item_description!== undefined ? item_description : "description";
                    const updatedItemDiscount = item_discount >0 ? item_discount : 0
                    const updatedItemType = (typeof(item_type) === "boolean" && item_type === true) || (typeof(item_type) === "string" && item_type.toLowerCase() === "veg") ? true : false;
                    const updatedItemRating = item_rating >0 ? item_rating : 0
                    const addItemQuery = `
                        INSERT INTO 
                                    menu(
                                        item_name,
                                        item_price,
                                        item_availability,
                                        item_image,
                                        item_description,
                                        item_discount,
                                        item_added_by,
                                        item_type,
                                        restaurant_id,
                                        item_rating
                                    ) 
                                VALUES(
                                    '${updatedItemName}',
                                    ${updatedItemPrice},
                                    ${updatedItemAvailability},
                                    '${updatedItemImage}',
                                    '${updatedItemDescription}',
                                    ${updatedItemDiscount},
                                    ${item_added_by},
                                    ${updatedItemType},
                                    ${restaurant_id},
                                    ${updatedItemRating}
                                );

                    `;
                    pool.query(addItemQuery, async(error, result)=>{
                        if(error){
                            console.error('Error querying the database:', error);
                            response.status(500);
                            response.send({"error_msg" : 'Something went wrong,when querying the restaurant item details.'});
                         }else{
                            console.log('==='.repeat(15),'\n',`menu item ${item_name} added successfully!`)
                            console.log('==='.repeat(15))

                            response.send({
                                "success_msg": "Item added successfully!"
                              })
                        }
                    })
                    
                }
            }
        });
        
    }catch(e){
        console.log(`Error When Registering the User ${e.message}`);
        response.status(500); 
        response.send({"error_msg": "Internal Server Error!"});
    }
});


// update menu items
app.put('/update-menu-item/:itemId', authenticateToken, async(request, response)=>{
    try{
        console.log('==='.repeat(15),'\n',`menu item updating.......`)
        console.log('==='.repeat(15))
        const {itemId} = request.params;
        const {
            item_name,
            item_price,
            item_availability,
            item_image,
            item_description,
            item_discount,
            item_type,
            restaurant_id,
            item_rating
        } = request.body;
        const item_added_by = request.id;
        //check duplicate items in restaurants then add new item
        const itemExistsQuery =`
            SELECT * FROM menu
            WHERE item_id = ${itemId} AND item_added_by = ${request.id} AND restaurant_id = ${restaurant_id};
        `;

        pool.query(itemExistsQuery, async (error, itemDetails)=>{
            if(error){
                console.error('Error querying the database:', error);
                response.status(500);
                response.send({"error_msg" : 'Something went wrong,when querying the restaurant item details.'});
            }else{
                // validate user provided details and then
                const updatedItemName = item_name?.trim()?.length > 0 && item_name !== undefined ? item_name : itemDetails[0].item_name;
                const updatedItemPrice = item_price > 0 ? item_price : 0
                const updatedItemAvailability = (typeof(item_availability) === "boolean" && item_availability === true ) || (typeof(item_availability)=== "string" && item_availability?.toLowerCase() === "available") ? true : false;
                const updatedItemImage = item_image?.trim().length > 0 && item_image !== undefined && item_image?.startsWith("https://")? item_image : itemDetails[0].item_image;
                const updatedItemDescription = item_description?.trim().length > 0 && item_description!== undefined ? item_description : itemDetails[0].item_description;
                const updatedItemDiscount = item_discount >0 ? item_discount : 0
                const updatedItemType = (typeof(item_type) === "boolean" && item_type === true) || (typeof(item_type) === "string" && item_type.toLowerCase() === "veg") ? true : false;
                const updatedItemRating = item_rating > 0 ? item_rating : 0
               
                if(itemDetails?.length === 1 ){
                    const updateMenuItemQuery =`
                        UPDATE menu
                        SET  
                            item_name = '${updatedItemName}',
                            item_price = ${updatedItemPrice},
                            item_availability = ${updatedItemAvailability},
                            item_image = '${updatedItemImage}',
                            item_description ='${updatedItemDescription}',
                            item_discount =${updatedItemDiscount},
                            item_added_by = ${item_added_by},
                            item_type = ${updatedItemType},
                            restaurant_id = ${restaurant_id},
                            item_rating = ${updatedItemRating}
                        WHERE 
                            item_id = ${itemId} AND item_added_by = ${request.id} AND restaurant_id = ${restaurant_id};
                        
                    `;

                    pool.query(updateMenuItemQuery, async(error, result)=>{
                        if(error){
                            console.error('Error querying the database:', error);
                            response.status(500);
                            response.send({"error_msg" : 'Something went wrong,when querying the restaurant item details details.'});
                        }else{
                            console.log('==='.repeat(15),'\n',`menu item details updated successfully`)
                            console.log('==='.repeat(15))
                            response.send({"success_msg":"updated menu item successfully!"})
                        }
                    })
                
                    
                }else{
                    console.log('==='.repeat(15),'\n',`something went wrong,menu item details not updated`)
                    console.log('==='.repeat(15))
                    response.status(400);
                    response.send({"error_msg":"Provided details are wrong, please check the item id again!"});
                }

            }
        });

        

    }catch(e){
        console.log(`Error When Registering the User ${e.message}`);
        response.status(500); 
        response.send({"error_msg": "Internal Server Error!"});
    }
});

// delete menu items
app.delete('/delete-menu-item/:itemId', authenticateToken, async(request, response)=>{
    try{
        console.log('==='.repeat(15),'\n',`user-${request.username} is trying to delete the menu item....`)
        console.log('==='.repeat(15))
        const {itemId} = request.params;
        const userId = request.id
        // check restaurant exists with the given restaurant id then proceed for deletion

        const checkItemIdExistsQuery = `
            SELECT * FROM menu
                WHERE item_id = ${itemId} AND item_added_by = ${userId};
        `;

        pool.query(checkItemIdExistsQuery, async(error, itemDetails)=>{
            if(error){
                console.error('Error querying the database:', error);
                response.status(500);
                response.send({"error_msg" : 'Something went wrong,when querying the restaurant item details details.'});
            }else{
                if(itemDetails?.length>0){
                const deleteMenuItemQuery = `
                DELETE FROM menu
                WHERE item_id = ${itemId} AND item_added_by = ${userId};
            `;
            pool.query(deleteMenuItemQuery, async (error, results)=>{
                if(error){
                    console.error('Error querying the database:', error);
                    response.status(500);
                    response.send({"error_msg" : 'Something went wrong,when querying the restaurant details.'});
                }else{
                    console.log(results)
                    console.log('==='.repeat(15),'\n',`user-${request.username} is deleted menu item - ${itemDetails[0].item_name} successfully!`)
                    console.log('==='.repeat(15))
                    response.send({"success_msg":"Menu item details deleted successfully."})
                }
            });
        }else{
            console.log('==='.repeat(15),'\n',`menu item not exists...`)
            console.log('==='.repeat(15))
            response.status(400);
            response.send({"error_msg":"Menu Item not exists"});
        }

            }
        });
    }catch(e){
        console.log(`Error When Registering the User ${e.message}`);
        response.status(500); 
        response.send({"error_msg": "Internal Server Error!"});
    }
});

// get menu items

// getting all the restaurant details
app.get('/all-restaurants-details', authenticateToken, async(request, response)=>{
    try{
        const {
            search_q='',
            rating=0,
            location='',
            item_name = '',
            order_by = 'DESC'
        } = request.query

        console.log('==='.repeat(15),'\n',`getting all the restaurants list.......`)
        console.log('==='.repeat(15))

        const getAllRestaurantDetailsQuery = `
                    SELECT 
                        restaurants.restaurant_id as restaurant_id,
                        restaurants.restaurant_name as restaurant_name,
                        restaurants.restaurant_type as restaurant_type,
                        restaurants.restaurant_location as restaurant_location,
                        restaurants.restautant_added_at as restautant_added_at,
                        restaurants.restaurant_image_url as restaurant_image_url,
                        restaurants.restaurant_rating as restaurant_rating,
                        restaurant_user.id as restaurant_owner_id,
                        restaurant_user.username as restaurant_owner_name,
                        restaurant_user.user_image_url as restaurant_owner_image,
                        JSON_ARRAYAGG(
                            JSON_OBJECT(
                                "item_id", menu.item_id,
                                "item_name", menu.item_name,
                                "item_price", menu.item_price,
                                "item_availability", menu.item_availability,
                                "item_image", menu.item_image,
                                "item_description", menu.item_description,
                                "item_discount", menu.item_discount,
                                "item_added_by", menu.item_added_by,
                                "item_created_at", menu.item_created_at,
                                "item_type", menu.item_type,
                                "item_rating", menu.item_rating
                            )
                        ) as menu_items
                FROM 
                    restaurants
                INNER JOIN
                    users as restaurant_user ON restaurants.restaurant_owner = restaurant_user.id
                LEFT JOIN 
                    menu ON restaurants.restaurant_id = menu.restaurant_id
                WHERE
                    restaurant_name LIKE '%${search_q?.trim()}%' 
                    AND
                    restaurant_rating >= ${rating}
                    AND
                    UPPER(restaurant_location) LIKE UPPER('%${location?.trim()}%')
                GROUP BY
                    restaurant_id,
                    restaurant_name,
                    restaurant_type,
                    restaurant_location,
                    restautant_added_at,
                    restaurant_image_url,
                    restaurant_rating,
                    restaurant_owner_id,
                    restaurant_owner_name,
                    restaurant_owner_image
                ORDER BY restaurant_rating ${order_by}
    
            `;

       
        pool.query(getAllRestaurantDetailsQuery, async(error, restaurantsList)=>{
            if(error){
                console.error('Error querying the database:', error);
                response.status(500);
                response.send({"error_msg" : 'Something went wrong,when querying the restaurant item details details.'});
            }else{
                restaurantsList.forEach(element => element.menu_items = JSON.parse(element.menu_items));
                console.log('==='.repeat(15),'\n',`successfully retrieved restaurants list`)
                console.log('==='.repeat(15))
                response.send({"success_msg":restaurantsList});
            }
        });
       

    }catch(e){
        console.log(`Error When Registering the User ${e.message}`);
        response.status(500); 
        response.send({"error_msg": "Internal Server Error!"});
    }
});





app.listen(3500,()=>{
    console.log(`server running on http://localhost:3500`)
});

module.exports = app;
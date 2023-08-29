# ordernow backend api


###
GET http://localhost:3500/all-restaurants-details?search_q=&rating=3&location=hyderabad&item_name=idli&order_by=ASC
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImNoYW5kdSIsImlkIjoyLCJpYXQiOjE2OTI5Mzc0ODJ9.i-2mJA7O-EPA_WORHYkYj8xiVKbJMPIMrmHEBY06YFU


{
  "success_msg": [
    {
      "restaurant_id": 1,
      "restaurant_name": "Sample Restaurant",
      "restaurant_type": "multi-cuisiene",
      "restaurant_location": "Hyderabad",
      "restautant_added_at": "2023-08-24T14:23:15.000Z",
      "restaurant_image_url": "https://res.cloudinary.com/v45/image/upload/v1692978649/restaurantImage_4_acyevx.jpg",
      "restaurant_rating": 4,
      "restaurant_owner_id": 2,
      "restaurant_owner_name": "chandu",
      "restaurant_owner_image": "https://res.cloudinary.com/v45/image/upload/v1692979834/user_logo_1_t6ttzz.jpg",
      "menu_items": [
        {
          "item_id": 1,
          "item_name": "Idli",
          "item_type": 1,
          "item_image": "https://res.cloudinary.com/v45/image/upload/v1693112500/Idli-Recipe_iixmgy",
          "item_price": 30,
          "item_rating": 4.5,
          "item_added_by": 2,
          "item_discount": 0,
          "item_created_at": "2023-08-27 12:03:39.000000",
          "item_description": "Idli or idly(/ɪdliː/ (listen))  (plural: idlis) is a type of savoury rice cake, originating from South India, popular as a breakfast food in Southern India and in Sri Lanka. The cakes are made by steaming a batter consisting of fermented black lentils (de-husked) and rice. The fermentation process breaks down the starches so that they are more readily metabolised by the body.Idli has several variations, including rava idli, which is made from semolina. Regional variants include sanna of Konkan.",
          "item_availability": 1
        }
      ]
    }
  ]
}
###

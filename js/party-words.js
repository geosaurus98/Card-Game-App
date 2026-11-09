/* Bundled data for party games (no network). Browser: CGR.partyWords; Node: module.exports.
 * Charades also uses categories from impostor-words.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CGR = root.CGR || {}; root.CGR.partyWords = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    /* Things to act out (Charades "Actions" deck). */
    actions: [
      'Brushing your teeth', 'Riding a bike', 'Making a cup of tea', 'Walking a dog', 'Changing a nappy', 'Ironing a shirt', 'Flying a kite', 'Building a snowman', 'Washing a car', 'Mowing the lawn',
      'Baking a cake', 'Doing yoga', 'Playing the drums', 'Taking a selfie', 'Climbing a ladder', 'Fishing', 'Rowing a boat', 'Skiing', 'Surfing', 'Ice skating',
      'Putting up a tent', 'Wrapping a present', 'Blowing up a balloon', 'Juggling', 'Doing a magic trick', 'Milking a cow', 'Chopping onions', 'Eating spaghetti', 'Peeling a banana', 'Sneezing',
      'Waking up late', 'Getting a haircut', 'Painting a wall', 'Hammering a nail', 'Sawing wood', 'Planting a tree', 'Watering the plants', 'Feeding the ducks', 'Swatting a fly', 'Catching a bus',
      'Driving in traffic', 'Parallel parking', 'Changing a tyre', 'Pumping up a tyre', 'Hailing a taxi', 'Getting on a rollercoaster', 'Sunbathing', 'Building a sandcastle', 'Swimming underwater', 'Diving off a board',
      'Lifting weights', 'Running a marathon', 'Scoring a goal', 'Serving at tennis', 'Bowling', 'Playing golf', 'Shooting a basketball', 'Boxing', 'Doing a cartwheel', 'Skipping with a rope',
      'Playing the violin', 'Conducting an orchestra', 'Singing in the shower', 'Dancing at a disco', 'Ballet dancing', 'Line dancing', 'Taking a photo', 'Reading a newspaper', 'Typing on a computer', 'Answering the phone',
      'Texting', 'Video calling', 'Opening a jar', 'Carrying heavy shopping', 'Pushing a shopping trolley', 'Queueing', 'Paying at the till', 'Trying on shoes', 'Putting on make-up', 'Shaving',
      'Combing your hair', 'Tying a tie', 'Tying shoelaces', 'Putting on a coat in the wind', 'Opening an umbrella', 'Walking on ice', 'Stepping on a plug', 'Being stung by a bee', 'Getting caught in the rain', 'Falling asleep in class',
      'Blowing out birthday candles', 'Opening presents', 'Popping popcorn', 'Toasting marshmallows', 'Walking a tightrope', 'Riding a horse', 'Sword fighting', 'Being a robot', 'Being a statue', 'Walking like a penguin'
    ],
    /* Hot Potato prompts: name something that fits. */
    prompts: [
      'Name a fruit', 'Name a vegetable', 'Name an animal', 'Name a bird', 'Name a sea creature', 'Name an insect', 'Name a dog breed', 'Name a country', 'Name a capital city', 'Name a city',
      'Name a river', 'Name a colour', 'Name a sport', 'Name a board game', 'Name a card game', 'Name a musical instrument', 'Name a band or singer', 'Name a song', 'Name a film', 'Name a TV show',
      'Name a cartoon character', 'Name a superhero', 'Name a famous person', 'Name a footballer', 'Name a job', 'Name a school subject', 'Name something in a kitchen', 'Name something in a bathroom', 'Name something in a garden', 'Name something at the beach',
      'Name something cold', 'Name something hot', 'Name something round', 'Name something red', 'Name something green', 'Name something soft', 'Name something sticky', 'Name something that flies', 'Name something with wheels', 'Name something you can open',
      'Name a pizza topping', 'Name a sandwich filling', 'Name a breakfast food', 'Name a dessert', 'Name a drink', 'Name a sweet or chocolate bar', 'Name a crisp flavour', 'Name a type of cheese', 'Name a spice or herb', 'Name a cake',
      'Name an item of clothing', 'Name a shoe', 'Name a hat', 'Name a body part', 'Name a car brand', 'Name a type of vehicle', 'Name a shop', 'Name a toy', 'Name a fairy tale', 'Name a mythical creature',
      'Name a holiday or festival', 'Name a month', 'Name a planet or star', 'Name a weather word', 'Name a flower', 'Name a tree', 'Name a hobby', 'Name a dance', 'Name a language', 'Name a girl’s name',
      'Name a boy’s name', 'Name a word that rhymes with “cat”', 'Name a word that rhymes with “light”', 'Name a three-letter word', 'Name something you’d take camping', 'Name something in a classroom', 'Name something in a hospital', 'Name something on a farm', 'Name an emotion', 'Name a noise an animal makes'
    ]
  };
});

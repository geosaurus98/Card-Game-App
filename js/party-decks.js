/* Prompt decks for the second wave of party games (no network).
 * Browser: CGR.partyDecks; Node: module.exports (for tests).
 *  forbidden:  [word, banned1, banned2, banned3, banned4]
 *  mostLikely / neverHave: { family: [...], grownup: [...] }
 *  wouldRather: { family: [[a, b]], grownup: [[a, b]] }
 *  categories: things to name (Categories Countdown)
 *  songs: { deck: [[title, artist]] } — titles only, for humming */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CGR = root.CGR || {}; root.CGR.partyDecks = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  const forbidden = [
    ['Pizza', 'Cheese', 'Italy', 'Slice', 'Tomato'],
    ['Beach', 'Sand', 'Sea', 'Holiday', 'Waves'],
    ['Birthday', 'Cake', 'Candles', 'Party', 'Age'],
    ['Elephant', 'Trunk', 'Big', 'Grey', 'Ears'],
    ['Football', 'Goal', 'Pitch', 'Kick', 'Team'],
    ['Teacher', 'School', 'Class', 'Lesson', 'Pupils'],
    ['Snowman', 'Carrot', 'Winter', 'Cold', 'Build'],
    ['Rainbow', 'Colours', 'Pot of gold', 'Sky', 'Arc'],
    ['Toothbrush', 'Teeth', 'Paste', 'Clean', 'Bathroom'],
    ['Vampire', 'Blood', 'Fangs', 'Dracula', 'Bite'],
    ['Pirate', 'Ship', 'Treasure', 'Parrot', 'Eye patch'],
    ['Library', 'Books', 'Borrow', 'Quiet', 'Read'],
    ['Pancake', 'Flip', 'Batter', 'Breakfast', 'Syrup'],
    ['Astronaut', 'Space', 'Moon', 'Rocket', 'Helmet'],
    ['Camping', 'Tent', 'Outdoors', 'Fire', 'Sleeping bag'],
    ['Mirror', 'Reflection', 'Glass', 'Look', 'Face'],
    ['Umbrella', 'Rain', 'Wet', 'Open', 'Shelter'],
    ['Chocolate', 'Sweet', 'Cocoa', 'Bar', 'Brown'],
    ['Dentist', 'Teeth', 'Drill', 'Chair', 'Filling'],
    ['Hospital', 'Doctor', 'Nurse', 'Sick', 'Ambulance'],
    ['Wedding', 'Bride', 'Marry', 'Ring', 'Dress'],
    ['Penguin', 'Bird', 'Ice', 'Black and white', 'Waddle'],
    ['Volcano', 'Lava', 'Erupt', 'Mountain', 'Hot'],
    ['Guitar', 'Strings', 'Play', 'Music', 'Rock'],
    ['Superhero', 'Cape', 'Powers', 'Save', 'Villain'],
    ['Haircut', 'Scissors', 'Barber', 'Hairdresser', 'Short'],
    ['Airport', 'Plane', 'Fly', 'Passport', 'Gate'],
    ['Breakfast', 'Morning', 'Eat', 'Cereal', 'Toast'],
    ['Ghost', 'Scary', 'Haunted', 'Boo', 'Sheet'],
    ['Robot', 'Machine', 'Metal', 'Computer', 'Beep'],
    ['Cinema', 'Film', 'Movie', 'Popcorn', 'Screen'],
    ['Homework', 'School', 'Teacher', 'Study', 'Evening'],
    ['Moustache', 'Hair', 'Lip', 'Face', 'Beard'],
    ['Dinosaur', 'Extinct', 'T. rex', 'Fossil', 'Jurassic'],
    ['Magician', 'Trick', 'Rabbit', 'Hat', 'Wand'],
    ['Shower', 'Water', 'Wash', 'Bathroom', 'Soap'],
    ['Holiday', 'Travel', 'Trip', 'Away', 'Relax'],
    ['Alarm clock', 'Wake', 'Morning', 'Ring', 'Snooze'],
    ['Sandwich', 'Bread', 'Filling', 'Lunch', 'Slices'],
    ['Queen', 'King', 'Crown', 'Royal', 'Palace'],
    ['Shark', 'Fish', 'Teeth', 'Fin', 'Ocean'],
    ['Witch', 'Broomstick', 'Spell', 'Hat', 'Cauldron'],
    ['Bicycle', 'Pedal', 'Ride', 'Wheels', 'Bike'],
    ['Telephone', 'Call', 'Ring', 'Talk', 'Mobile'],
    ['Christmas', 'Santa', 'December', 'Presents', 'Tree'],
    ['Easter', 'Eggs', 'Bunny', 'Chocolate', 'Spring'],
    ['Halloween', 'October', 'Costume', 'Pumpkin', 'Trick or treat'],
    ['Supermarket', 'Shopping', 'Food', 'Trolley', 'Till'],
    ['Lighthouse', 'Coast', 'Sea', 'Ships', 'Tower'],
    ['Kangaroo', 'Australia', 'Jump', 'Pouch', 'Hop'],
    ['Ice cream', 'Cold', 'Cone', 'Scoop', 'Flavour'],
    ['Firefighter', 'Flames', 'Engine', 'Hose', 'Rescue'],
    ['Pyjamas', 'Bed', 'Sleep', 'Night', 'Wear'],
    ['Snake', 'Hiss', 'Reptile', 'Slither', 'Venom'],
    ['Rollercoaster', 'Ride', 'Theme park', 'Loop', 'Scream'],
    ['Pillow', 'Bed', 'Head', 'Soft', 'Sleep'],
    ['Passport', 'Travel', 'Photo', 'Country', 'Border'],
    ['Lemon', 'Yellow', 'Sour', 'Fruit', 'Juice'],
    ['Detective', 'Mystery', 'Clue', 'Solve', 'Crime'],
    ['Sunglasses', 'Summer', 'Eyes', 'Wear', 'Shades'],
    ['Zoo', 'Animals', 'Cages', 'Visit', 'Keeper'],
    ['Farm', 'Animals', 'Tractor', 'Farmer', 'Cows'],
    ['Castle', 'King', 'Walls', 'Tower', 'Knight'],
    ['Snorkel', 'Swim', 'Mask', 'Breathe', 'Underwater'],
    ['Map', 'Directions', 'Lost', 'Country', 'Route'],
    ['Thunder', 'Lightning', 'Storm', 'Loud', 'Rain'],
    ['Wallet', 'Money', 'Cards', 'Pocket', 'Purse'],
    ['Football boots', 'Feet', 'Studs', 'Kick', 'Shoes'],
    ['Candle', 'Wax', 'Flame', 'Light', 'Wick'],
    ['Sleepover', 'Friends', 'Night', 'Stay', 'Sleeping bag'],
    ['Selfie', 'Photo', 'Phone', 'Yourself', 'Camera'],
    ['Television', 'Watch', 'Screen', 'Remote', 'Programme'],
    ['Remote control', 'TV', 'Buttons', 'Channel', 'Couch'],
    ['Lunchbox', 'School', 'Food', 'Sandwich', 'Pack'],
    ['Spider', 'Web', 'Legs', 'Eight', 'Creepy'],
    ['Cowboy', 'Horse', 'Hat', 'West', 'Lasso'],
    ['Picnic', 'Blanket', 'Basket', 'Outside', 'Food'],
    ['Sunburn', 'Beach', 'Red', 'Skin', 'Cream'],
    ['Traffic jam', 'Cars', 'Road', 'Stuck', 'Queue'],
    ['Escalator', 'Stairs', 'Moving', 'Shop', 'Up'],
    ['Bubble bath', 'Tub', 'Foam', 'Soap', 'Relax'],
    ['Swimming pool', 'Leisure centre', 'Water', 'Dive', 'Lanes'],
    ['Tooth fairy', 'Coin', 'Pillow', 'Money', 'Wings'],
    ['Hedgehog', 'Spikes', 'Prickly', 'Animal', 'Curl'],
    ['Moon', 'Night', 'Sky', 'Full', 'Space'],
    ['Pumpkin', 'Orange', 'Halloween', 'Carve', 'Vegetable'],
    ['Skateboard', 'Wheels', 'Ride', 'Tricks', 'Ramp'],
    ['Bakery', 'Bread', 'Cakes', 'Oven', 'Shop'],
    ['Fireworks', 'Bang', 'Sky', 'Night', 'Explode'],
    ['Treasure', 'Gold', 'Chest', 'Pirate', 'Hidden'],
    ['Knight', 'Armour', 'Sword', 'Horse', 'Castle'],
    ['Mermaid', 'Tail', 'Sea', 'Fish', 'Half'],
    ['Unicorn', 'Horn', 'Horse', 'Magic', 'Rainbow'],
    ['Waterfall', 'Niagara', 'Drop', 'River', 'Cliff'],
    ['Hiccups', 'Breath', 'Jump', 'Water', 'Stop'],
    ['Sneeze', 'Nose', 'Achoo', 'Cold', 'Bless you'],
    ['Yawn', 'Tired', 'Mouth', 'Sleepy', 'Bored'],
    ['Queue', 'Line', 'Wait', 'Turn', 'Shop'],
    ['Charity shop', 'Second-hand', 'Donate', 'Cheap', 'Clothes'],
    ['Musical chairs', 'Song', 'Sit', 'Party', 'Stop'],
    ['Hide and seek', 'Ready or not', 'Find', 'Count', 'Game'],
    ['Paper aeroplane', 'Fold', 'Fly', 'Wings', 'Throw'],
    ['Sandcastle', 'Beach', 'Bucket', 'Spade', 'Build'],
    ['Lottery', 'Win', 'Numbers', 'Ticket', 'Millions'],
    ['Job interview', 'Work', 'Questions', 'Hire', 'CV'],
    ['Group chat', 'Messages', 'Phone', 'Friends', 'Text'],
    ['Password', 'Secret', 'Login', 'Computer', 'Forget'],
    ['Wi-Fi', 'Internet', 'Password', 'Connect', 'Signal'],
    ['Battery', 'Charge', 'Power', 'Phone', 'Flat'],
    ['Podcast', 'Listen', 'Episode', 'Audio', 'Talk'],
    ['Gym', 'Exercise', 'Weights', 'Fit', 'Workout'],
    ['Diet', 'Food', 'Weight', 'Healthy', 'Eat'],
    ['Takeaway', 'Food', 'Order', 'Delivery', 'Home'],
    ['Barbecue', 'Grill', 'Sausages', 'Garden', 'Summer'],
    ['Ice skating', 'Winter', 'Rink', 'Skates', 'Fall'],
    ['Tattoo', 'Ink', 'Skin', 'Needle', 'Arm'],
    ['Karaoke', 'Sing', 'Microphone', 'Song', 'Lyrics'],
    ['Road trip', 'Car', 'Drive', 'Journey', 'Travel'],
    ['Gossip', 'Talk', 'Rumour', 'Secret', 'Whisper'],
    ['Traffic lights', 'Red', 'Green', 'Stop', 'Road'],
    ['Flip-flops', 'Shoes', 'Summer', 'Beach', 'Feet']
  ];

  const mostLikely = {
    family: [
      'become famous', 'win a gold medal', 'live to be 100', 'become a millionaire', 'get lost in their own town', 'forget their own birthday', 'laugh at their own joke', 'fall asleep in a film',
      'eat the last biscuit and not tell anyone', 'cry at a cartoon', 'talk to animals', 'become a teacher', 'go to space', 'write a book', 'be on TV', 'adopt ten pets',
      'trip over nothing', 'sing in the shower', 'dance in the supermarket', 'win a talent show', 'invent something useful', 'get a pie in the face', 'become a chef', 'run a marathon',
      'be late for their own party', 'keep a secret', 'tell a secret', 'eat something off the floor', 'get the giggles at the wrong time', 'start a food fight', 'win a staring contest', 'climb a mountain',
      'become a famous YouTuber', 'build a treehouse', 'meet a celebrity', 'win the lottery and lose the ticket', 'spend all day in pyjamas', 'beat everyone at a board game', 'cheat at a board game', 'eat dessert first',
      'get stuck in a lift', 'lose their phone at home', 'wear odd socks', 'forget where they parked', 'save the world', 'become a detective', 'scream at a spider', 'befriend a stranger',
      'turn up in fancy dress on the wrong day', 'organise a surprise party', 'ruin a surprise party', 'go on a reality show', 'become a famous singer', 'have the messiest bedroom', 'never get bored', 'make everyone laugh',
      'get a funny haircut', 'eat the spiciest food', 'go a whole day without talking', 'win a hot dog eating contest', 'say something embarrassing to a teacher', 'call a teacher Mum or Dad', 'sleep through an alarm', 'still be awake at 3 a.m.',
      'travel the world', 'live on a boat', 'live in a castle', 'become a famous artist', 'have the best excuse', 'blame someone else', 'read every book in the library', 'remember everyone’s birthday',
      'buy something they don’t need', 'bake the best cake', 'set off the smoke alarm cooking', 'talk their way out of trouble', 'get told off', 'apologise to a door after walking into it', 'wave back at someone who wasn’t waving at them', 'be a contestant on a quiz show'
    ],
    grownup: [
      'text their ex', 'send a message to the wrong person', 'fall asleep at a party', 'go viral by accident', 'quit their job to travel', 'get a tattoo on holiday', 'forget someone’s name mid-conversation', 'cry at an advert',
      'spend too much on a takeaway', 'start a business', 'get married in Las Vegas', 'be the first to leave a party', 'be the last to leave a party', 'lie about their age', 'stalk someone online', 'still be paying off a credit card',
      'reply-all by accident', 'show up late to their own wedding', 'move to another country', 'be on a dating show', 'have a secret social media account', 'win an argument they’re wrong about', 'fake being ill to skip work', 'buy a sports car in a midlife crisis',
      'go on a terrible first date', 'set up their friends', 'get kicked out of a club', 'sing karaoke without being asked', 'spoil the end of a series', 'binge a whole series in one night', 'order the same thing every time', 'complain in a restaurant',
      'become a reality TV star', 'pay for everyone’s drinks', 'forget their bank card on a night out', 'end up in the wrong city', 'make friends with the bouncer', 'have a dramatic exit', 'start a group chat argument', 'leave a group chat',
      'read the messages and never reply', 'fall for a scam', 'run a mile for a free sample', 'still have their first ever phone', 'be in bed by 9 p.m. on a Saturday', 'get a hangover from two drinks', 'dance on a table', 'lose their voice from singing'
    ]
  };

  const wouldRather = {
    family: [
      ['be able to fly', 'be invisible'], ['live in space', 'live under the sea'], ['have a pet dragon', 'have a pet unicorn'], ['only eat pizza', 'only eat ice cream'],
      ['be the funniest person', 'be the smartest person'], ['never have homework', 'never have to tidy your room'], ['talk to animals', 'speak every language'], ['be a famous singer', 'be a famous footballer'],
      ['live in a treehouse', 'live in a castle'], ['have no phone for a month', 'have no TV for a month'], ['always be too hot', 'always be too cold'], ['have super speed', 'have super strength'],
      ['be a pirate', 'be a ninja'], ['eat a bug', 'lick a slug'], ['have a rewind button', 'have a pause button for life'], ['go to the past', 'go to the future'],
      ['be able to breathe underwater', 'be able to see in the dark'], ['never be bored', 'never be sad'], ['live without music', 'live without films'], ['have a robot butler', 'have a self-driving car'],
      ['be a giant', 'be tiny'], ['have hands for feet', 'feet for hands'], ['always have to sing instead of talk', 'always have to dance when you walk'], ['meet a dinosaur', 'meet an alien'],
      ['be stuck in a lift with a lion', 'be stuck in a lift with a skunk'], ['have a never-ending chocolate bar', 'a never-ending bag of crisps'], ['visit every country', 'visit the Moon'], ['be a wizard', 'be a superhero'],
      ['win a gold medal', 'win an Oscar'], ['have the longest hair in the world', 'have no hair at all'], ['only whisper', 'only shout'], ['wear pyjamas forever', 'wear a suit forever'],
      ['have a slide in your house', 'have a swimming pool in your house'], ['live at the beach', 'live in the mountains'], ['eat cold pizza every day', 'eat cold chips every day'], ['be the best at sport', 'be the best at video games'],
      ['have a talking dog', 'have a flying cat'], ['be famous for something silly', 'be unknown for something amazing'], ['have three eyes', 'have three arms'], ['go to school at night', 'go to school at weekends'],
      ['laugh every time someone says your name', 'sneeze every time you hear a bell'], ['never eat sweets again', 'never eat chips again'], ['always know what time it is', 'always know where north is'], ['ride a giant snail', 'ride a giant tortoise'],
      ['have a clone', 'have a time machine'], ['live in a snow globe', 'live in a bubble'], ['spend a day as your pet', 'spend a day as your teacher'], ['explore a jungle', 'explore the Arctic'],
      ['have a magic carpet', 'have a magic broom'], ['always be 10 minutes late', 'always be 20 minutes early'], ['have breakfast for every meal', 'have dessert for every meal'], ['live in a world with no colours', 'a world with no sounds'],
      ['be a famous chef', 'be a famous artist'], ['eat a whole lemon', 'eat a whole onion'], ['find buried treasure', 'discover a new animal'], ['have rainbow hair', 'have glow-in-the-dark skin'],
      ['be the oldest child', 'be the youngest child'], ['never get tired', 'never get hungry'], ['have a robot best friend', 'have an alien best friend'], ['live in a city', 'live in the countryside']
    ],
    grownup: [
      ['know when you will die', 'know how you will die'], ['lose your phone', 'lose your wallet'], ['have your browser history read out', 'have your texts read out'], ['never drink coffee again', 'never drink alcohol again'],
      ['be rich and unknown', 'be famous and broke'], ['work four long days', 'work five short days'], ['have a dream job with bad pay', 'a boring job with great pay'], ['always say what you think', 'never speak again'],
      ['go back to your first job', 'go back to school'], ['have no Wi-Fi for a month', 'no hot water for a month'], ['be stuck on a long-haul flight next to a crying baby', 'next to someone who talks non-stop'], ['find your partner’s diary', 'have them find yours'],
      ['give a wedding speech unprepared', 'sing at a wedding'], ['date someone with no sense of humour', 'someone who laughs at everything'], ['move abroad alone', 'never leave your home town'], ['have your parents as flatmates', 'have your boss as a flatmate'],
      ['spend a week in silence', 'a week without your phone'], ['always have a hangover', 'never be able to drink again'], ['win the lottery', 'live twice as long'], ['retire now', 'work until 70 and be very rich'],
      ['have every meeting be an email', 'every email be a meeting'], ['live without takeaways', 'live without streaming TV'], ['re-live your teenage years', 'skip to your old age'], ['have a free holiday every year', 'free food for life'],
      ['be the funniest in the room', 'the best-looking in the room'], ['always have to reply-all', 'never be able to reply at all'], ['lose all your photos', 'lose all your messages'], ['have a terrible boss', 'terrible colleagues']
    ]
  };

  const neverHave = {
    family: [
      'been on a plane', 'broken a bone', 'eaten snails', 'stayed up all night', 'been to a concert', 'met someone famous', 'fallen asleep at school', 'cried at a film',
      'ridden a horse', 'been in a newspaper', 'won a trophy', 'got lost in a shop', 'eaten a whole pizza by myself', 'been sick on a ride', 'lied about brushing my teeth', 'pretended to be ill to stay home',
      'seen a ghost', 'cut my own hair', 'been to another country', 'swum in the sea', 'slept in a tent', 'tripped over in public', 'laughed so hard I cried', 'forgotten a friend’s birthday',
      'sung in public', 'danced on a stage', 'been stung by a bee', 'broken something and hidden it', 'read a whole book in one day', 'eaten food off the floor', 'had a nickname I hated', 'got stuck somewhere',
      'been to a wedding', 'built a sandcastle', 'climbed a tree', 'touched a snake', 'had a sleepover', 'been on a boat', 'ridden a rollercoaster', 'won a competition',
      'told a lie to get out of trouble', 'eaten a bug', 'had braces', 'seen snow', 'baked a cake', 'grown a plant', 'locked myself out', 'walked into a glass door',
      'waved at someone who wasn’t waving at me', 'called a teacher Mum or Dad', 'cheated at a board game', 'stayed in my pyjamas all day', 'eaten dessert before dinner', 'had a food fight', 'gone a whole day without my phone', 'been to the hospital in an ambulance',
      'met a twin', 'learned to juggle', 'made a snow angel', 'been on TV', 'had a pet fish', 'flown a kite', 'played an instrument in front of people', 'beaten an adult at a game',
      'spilled a drink on someone', 'fallen out of bed', 'laughed at the wrong moment', 'had a song stuck in my head all day', 'tried to lick my elbow', 'talked in my sleep', 'sleepwalked', 'had a dream come true'
    ],
    grownup: [
      'sent a text to the wrong person', 'been on a blind date', 'ghosted someone', 'been ghosted', 'lied on my CV', 'called in sick when I wasn’t', 'fallen asleep at work', 'cried at work',
      'stalked an ex online', 'been kicked out of a pub or club', 'forgotten someone’s name on a date', 'sung karaoke', 'been on a dating app', 'lost my phone on a night out', 'missed a flight', 'got a tattoo',
      'regretted a haircut', 'eaten a whole takeaway alone', 'binge-watched a series in one day', 'pretended to like a present', 're-gifted a present', 'said “you too” when the waiter said “enjoy your meal”', 'got lost in my own city', 'gone skinny dipping',
      'left a party without saying goodbye', 'been the last to leave a party', 'danced on a table', 'had a crush on a teacher', 'lied about my age', 'read someone else’s messages', 'blamed something on the dog', 'pretended my phone was dead to avoid a call',
      'turned up to the wrong event', 'worn the same outfit two days in a row', 'eaten something that fell on the floor at a party', 'laughed during a serious moment', 'been told off by a stranger', 'cut my own fringe', 'run for a bus and missed it', 'fallen over on a night out'
    ]
  };

  const categories = [
    'Fruit', 'Vegetables', 'Animals', 'Birds', 'Fish or sea creatures', 'Insects', 'Dog breeds', 'Countries', 'Capital cities', 'Cities',
    'Rivers', 'Colours', 'Sports', 'Board games', 'Musical instruments', 'Bands or singers', 'Songs', 'Films', 'TV shows', 'Cartoon characters',
    'Superheroes', 'Famous people', 'Footballers', 'Jobs', 'School subjects', 'Things in a kitchen', 'Things in a bathroom', 'Things in a garden', 'Things at the beach', 'Things in a classroom',
    'Things that are cold', 'Things that are hot', 'Things that are round', 'Things that are red', 'Things that are green', 'Things that are soft', 'Things that fly', 'Things with wheels', 'Things you can open', 'Things in a fridge',
    'Pizza toppings', 'Sandwich fillings', 'Breakfast foods', 'Desserts', 'Drinks', 'Sweets and chocolate bars', 'Crisp flavours', 'Cheeses', 'Herbs and spices', 'Cakes and biscuits',
    'Clothes', 'Shoes', 'Hats', 'Body parts', 'Car brands', 'Vehicles', 'Shops', 'Toys', 'Fairy tales', 'Mythical creatures',
    'Holidays and festivals', 'Flowers', 'Trees', 'Hobbies', 'Dances', 'Languages', 'Girls’ names', 'Boys’ names', 'Things you take camping', 'Things on a farm',
    'Emotions', 'Animal noises', 'Things in a hospital', 'Things in an office', 'Weather words', 'Planets and space things', 'Pets', 'Things you can recycle', 'Things with buttons', 'Things that smell nice',
    'Things that smell bad', 'Things that are sticky', 'Things made of wood', 'Things made of metal', 'Things you plug in', 'Things in a toolbox', 'Things in a handbag', 'Things you find in a park', 'Things at a party', 'Things at a wedding',
    'Apps and websites', 'Video games', 'Book titles', 'Disney films', 'Christmas things', 'Halloween things', 'Words that rhyme with “cat”', 'Words that rhyme with “day”', 'Words ending in -ing', 'Things that are yellow'
  ];

  const songs = {
    'Films & kids': [
      ['Let It Go', 'Frozen'], ['Hakuna Matata', 'The Lion King'], ['Under the Sea', 'The Little Mermaid'], ['A Whole New World', 'Aladdin'], ['You’ve Got a Friend in Me', 'Toy Story'],
      ['How Far I’ll Go', 'Moana'], ['We Don’t Talk About Bruno', 'Encanto'], ['The Bare Necessities', 'The Jungle Book'], ['Circle of Life', 'The Lion King'], ['Be Our Guest', 'Beauty and the Beast'],
      ['Supercalifragilisticexpialidocious', 'Mary Poppins'], ['Heigh-Ho', 'Snow White and the Seven Dwarfs'], ['Do You Want to Build a Snowman?', 'Frozen'], ['I Just Can’t Wait to Be King', 'The Lion King'], ['Happy', 'Pharrell Williams'],
      ['The Wheels on the Bus', 'Nursery rhyme'], ['Twinkle Twinkle Little Star', 'Nursery rhyme'], ['Old MacDonald Had a Farm', 'Nursery rhyme'], ['Baby Shark', 'Children’s song'], ['Happy Birthday', 'Traditional'],
      ['Somewhere Over the Rainbow', 'The Wizard of Oz'], ['Ghostbusters', 'Ray Parker Jr.'], ['My Heart Will Go On', 'Celine Dion'], ['Eye of the Tiger', 'Survivor'], ['Star Wars main theme', 'John Williams'],
      ['Jaws theme', 'John Williams'], ['The Pink Panther theme', 'Henry Mancini'], ['James Bond theme', 'Monty Norman'], ['Mission: Impossible theme', 'Lalo Schifrin'], ['Harry Potter theme (Hedwig’s Theme)', 'John Williams'],
      ['Shake It Off', 'Taylor Swift'], ['Can’t Stop the Feeling!', 'Justin Timberlake'], ['This Is Me', 'The Greatest Showman'], ['Remember Me', 'Coco'], ['Into the Unknown', 'Frozen 2']
    ],
    'Classics': [
      ['Bohemian Rhapsody', 'Queen'], ['We Will Rock You', 'Queen'], ['Don’t Stop Me Now', 'Queen'], ['Hey Jude', 'The Beatles'], ['Yellow Submarine', 'The Beatles'],
      ['Let It Be', 'The Beatles'], ['Dancing Queen', 'ABBA'], ['Mamma Mia', 'ABBA'], ['Waterloo', 'ABBA'], ['Billie Jean', 'Michael Jackson'],
      ['Thriller', 'Michael Jackson'], ['Beat It', 'Michael Jackson'], ['I Will Survive', 'Gloria Gaynor'], ['YMCA', 'Village People'], ['Sweet Caroline', 'Neil Diamond'],
      ['Livin’ on a Prayer', 'Bon Jovi'], ['Don’t Stop Believin’', 'Journey'], ['Africa', 'Toto'], ['Take On Me', 'a-ha'], ['Girls Just Want to Have Fun', 'Cyndi Lauper'],
      ['Wonderwall', 'Oasis'], ['Stayin’ Alive', 'Bee Gees'], ['Hotel California', 'Eagles'], ['Like a Prayer', 'Madonna'], ['Respect', 'Aretha Franklin'],
      ['Twist and Shout', 'The Beatles'], ['Jailhouse Rock', 'Elvis Presley'], ['Hound Dog', 'Elvis Presley'], ['Johnny B. Goode', 'Chuck Berry'], ['What a Wonderful World', 'Louis Armstrong'],
      ['Happy Together', 'The Turtles'], ['Wannabe', 'Spice Girls'], ['…Baby One More Time', 'Britney Spears'], ['Mr. Brightside', 'The Killers'], ['Smells Like Teen Spirit', 'Nirvana'],
      ['Sweet Child o’ Mine', 'Guns N’ Roses'], ['Walk This Way', 'Aerosmith'], ['I Wanna Dance with Somebody', 'Whitney Houston'], ['Ice Ice Baby', 'Vanilla Ice'], ['Macarena', 'Los del Río']
    ],
    'Pop hits': [
      ['Shape of You', 'Ed Sheeran'], ['Blinding Lights', 'The Weeknd'], ['Uptown Funk', 'Mark Ronson ft. Bruno Mars'], ['Rolling in the Deep', 'Adele'], ['Hello', 'Adele'],
      ['Bad Guy', 'Billie Eilish'], ['Single Ladies', 'Beyoncé'], ['Crazy in Love', 'Beyoncé'], ['Umbrella', 'Rihanna'], ['Firework', 'Katy Perry'],
      ['Roar', 'Katy Perry'], ['Call Me Maybe', 'Carly Rae Jepsen'], ['Poker Face', 'Lady Gaga'], ['Bad Romance', 'Lady Gaga'], ['Toxic', 'Britney Spears'],
      ['Despacito', 'Luis Fonsi'], ['Gangnam Style', 'PSY'], ['Watermelon Sugar', 'Harry Styles'], ['As It Was', 'Harry Styles'], ['Levitating', 'Dua Lipa'],
      ['Don’t Start Now', 'Dua Lipa'], ['Someone Like You', 'Adele'], ['Thinking Out Loud', 'Ed Sheeran'], ['Perfect', 'Ed Sheeran'], ['Sorry', 'Justin Bieber'],
      ['Baby', 'Justin Bieber'], ['Love Story', 'Taylor Swift'], ['Anti-Hero', 'Taylor Swift'], ['Flowers', 'Miley Cyrus'], ['Party in the U.S.A.', 'Miley Cyrus'],
      ['Old Town Road', 'Lil Nas X'], ['Counting Stars', 'OneRepublic'], ['Viva la Vida', 'Coldplay'], ['Yellow', 'Coldplay'], ['Seven Nation Army', 'The White Stripes'],
      ['Dance Monkey', 'Tones and I'], ['Rather Be', 'Clean Bandit'], ['Hips Don’t Lie', 'Shakira'], ['Waka Waka', 'Shakira'], ['Somebody That I Used to Know', 'Gotye']
    ],
    'Christmas': [
      ['Jingle Bells', 'Traditional'], ['Rudolph the Red-Nosed Reindeer', 'Traditional'], ['All I Want for Christmas Is You', 'Mariah Carey'], ['Last Christmas', 'Wham!'], ['Silent Night', 'Carol'],
      ['We Wish You a Merry Christmas', 'Carol'], ['Deck the Halls', 'Carol'], ['Santa Claus Is Coming to Town', 'Traditional'], ['Frosty the Snowman', 'Traditional'], ['Let It Snow!', 'Traditional'],
      ['Jingle Bell Rock', 'Bobby Helms'], ['Rockin’ Around the Christmas Tree', 'Brenda Lee'], ['Feliz Navidad', 'José Feliciano'], ['White Christmas', 'Bing Crosby'], ['Do They Know It’s Christmas?', 'Band Aid'],
      ['Merry Xmas Everybody', 'Slade'], ['I Wish It Could Be Christmas Everyday', 'Wizzard'], ['Fairytale of New York', 'The Pogues'], ['Away in a Manger', 'Carol'], ['O Come, All Ye Faithful', 'Carol'],
      ['Hark! The Herald Angels Sing', 'Carol'], ['The Twelve Days of Christmas', 'Carol'], ['Little Drummer Boy', 'Carol'], ['Winter Wonderland', 'Traditional'], ['Walking in the Air', 'The Snowman']
    ]
  };

  /* Forehead Guess extra decks: well-known people (real) and characters (fictional). */
  const famous = [
    'Albert Einstein', 'William Shakespeare', 'Queen Elizabeth II', 'King Charles III', 'Napoleon', 'Cleopatra', 'Julius Caesar', 'Abraham Lincoln', 'Winston Churchill', 'Nelson Mandela',
    'Martin Luther King Jr.', 'Mahatma Gandhi', 'Leonardo da Vinci', 'Pablo Picasso', 'Vincent van Gogh', 'Mozart', 'Beethoven', 'Isaac Newton', 'Charles Darwin', 'Marie Curie',
    'Florence Nightingale', 'Christopher Columbus', 'Neil Armstrong', 'Amelia Earhart', 'Henry VIII', 'Elvis Presley', 'Michael Jackson', 'Madonna', 'The Beatles', 'Freddie Mercury',
    'David Bowie', 'Elton John', 'Taylor Swift', 'Beyoncé', 'Adele', 'Ed Sheeran', 'Lady Gaga', 'Rihanna', 'Harry Styles', 'Dolly Parton',
    'Marilyn Monroe', 'Charlie Chaplin', 'Audrey Hepburn', 'Tom Cruise', 'Tom Hanks', 'Leonardo DiCaprio', 'Brad Pitt', 'Will Smith', 'Dwayne Johnson', 'Arnold Schwarzenegger',
    'Meryl Streep', 'Emma Watson', 'Daniel Radcliffe', 'Jackie Chan', 'Bruce Lee', 'Mr. Bean', 'Oprah Winfrey', 'David Attenborough', 'Gordon Ramsay', 'Jamie Oliver',
    'Walt Disney', 'Steve Jobs', 'Bill Gates', 'Elon Musk', 'Mark Zuckerberg', 'J.K. Rowling', 'Roald Dahl', 'Agatha Christie', 'Charles Dickens', 'Jane Austen',
    'Lionel Messi', 'Cristiano Ronaldo', 'David Beckham', 'Pelé', 'Serena Williams', 'Roger Federer', 'Usain Bolt', 'Muhammad Ali', 'Michael Jordan', 'Lewis Hamilton',
    'Tiger Woods', 'Simone Biles', 'Mo Farah', 'Andy Murray', 'Wayne Rooney', 'Barack Obama', 'Donald Trump', 'Princess Diana', 'Prince William', 'Kim Kardashian',
    'Santa Claus', 'Robin Hood', 'King Arthur', 'Joan of Arc', 'Tutankhamun', 'Genghis Khan', 'Galileo', 'Frida Kahlo', 'Bob Marley', 'Stephen Hawking'
  ];
  const characters = [
    'Harry Potter', 'Hermione Granger', 'Voldemort', 'Darth Vader', 'Luke Skywalker', 'Yoda', 'Spider-Man', 'Batman', 'Superman', 'Wonder Woman',
    'Iron Man', 'The Hulk', 'Captain America', 'Thor', 'The Joker', 'Mickey Mouse', 'Minnie Mouse', 'Donald Duck', 'Goofy', 'Winnie the Pooh',
    'Peter Pan', 'Tinker Bell', 'Captain Hook', 'Cinderella', 'Snow White', 'Elsa', 'Olaf', 'Simba', 'Shrek', 'Donkey',
    'Buzz Lightyear', 'Woody', 'Nemo', 'Dory', 'Mario', 'Luigi', 'Pikachu', 'Sonic the Hedgehog', 'Pac-Man', 'Lara Croft',
    'Sherlock Holmes', 'James Bond', 'Indiana Jones', 'Dracula', 'Frankenstein’s monster', 'Gandalf', 'Frodo', 'Gollum', 'Bilbo Baggins', 'Willy Wonka',
    'The BFG', 'Matilda', 'Paddington Bear', 'Peppa Pig', 'SpongeBob SquarePants', 'Homer Simpson', 'Bart Simpson', 'Scooby-Doo', 'Bugs Bunny', 'Garfield',
    'Snoopy', 'Kermit the Frog', 'Miss Piggy', 'Elmo', 'Cookie Monster', 'The Grinch', 'Mr. Tickle', 'Wallace and Gromit', 'Shaun the Sheep', 'Postman Pat',
    'Bob the Builder', 'Thomas the Tank Engine', 'Alice in Wonderland', 'The Mad Hatter', 'Pinocchio', 'Rapunzel', 'Little Red Riding Hood', 'Puss in Boots', 'Jack Sparrow', 'Mary Poppins'
  ];

  return { forbidden, mostLikely, wouldRather, neverHave, categories, songs, famous, characters };
});

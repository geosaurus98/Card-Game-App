/* Content for the drinking games (no network). Browser: CGR.drinkData; Node: module.exports.
 * Everything is phrased as "sips" and works with any drink, including soft drinks. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CGR = root.CGR || {}; root.CGR.drinkData = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  /* Kings: rank → [title, what happens]. Two common rule sets; every card can be edited in the app. */
  const kings = {
    kings: {
      name: 'Kings (common rules)',
      A: ['Waterfall', 'Everyone starts drinking at once. You can only stop when the person before you stops — the drawer stops whenever they like.'],
      2: ['You', 'Pick someone to drink.'],
      3: ['Me', 'You drink.'],
      4: ['Floor', 'Last person to touch the floor drinks.'],
      5: ['Guys', 'All the guys drink.'],
      6: ['Ladies', 'All the ladies drink.'],
      7: ['Heaven', 'Last person to point to the sky drinks.'],
      8: ['Mate', 'Pick a mate: whenever you drink, they drink too (until the next 8).'],
      9: ['Rhyme', 'Say a word; go round rhyming with it. First to repeat or freeze drinks.'],
      10: ['Categories', 'Pick a category (e.g. car brands); go round naming things. First to repeat or freeze drinks.'],
      J: ['Make a rule', 'Invent a rule everyone must follow until the next Jack. Break it, drink.'],
      Q: ['Question master', 'Anyone who answers a question you ask drinks — until the next Queen.'],
      K: ['King’s Cup', 'Pour some of your drink into the cup in the middle. Whoever draws the 4th King drinks the cup.']
    },
    ringoffire: {
      name: 'Ring of Fire (UK rules)',
      A: ['Waterfall', 'Everyone drinks; you can’t stop until the person before you stops.'],
      2: ['You', 'Choose someone to drink.'],
      3: ['Me', 'You drink.'],
      4: ['Floor', 'Last to touch the floor drinks.'],
      5: ['Thumb master', 'Put your thumb on the table any time; the last to copy drinks. Lasts until the next 5.'],
      6: ['Guys', 'All the guys drink.'],
      7: ['Heaven', 'Last to point up drinks.'],
      8: ['Mate', 'Choose a drinking mate for the rest of the game.'],
      9: ['Bust a rhyme', 'Rhyme round the circle; first to fail drinks.'],
      10: ['Social', 'Everyone drinks!'],
      J: ['Rule', 'Make a rule for the rest of the game.'],
      Q: ['Ladies', 'All the ladies drink.'],
      K: ['King’s Cup', 'Pour into the cup. The 4th King drinks it all — or skip that and just drink 3 sips.']
    }
  };

  const truth = {
    mild: [
      'What is the most embarrassing thing you’ve done in front of a crush?', 'What is your most irrational fear?', 'What’s the worst gift you’ve ever received — and from whom?',
      'Which person here would you trust with your phone unlocked?', 'What is the last lie you told?', 'What is your worst habit?',
      'What’s the most childish thing you still do?', 'Who in this room do you text the most?', 'What is your guilty-pleasure song?',
      'What’s the weirdest thing you’ve ever eaten?', 'What is the worst haircut you’ve ever had?', 'What did you want to be when you were ten?',
      'What’s the longest you’ve gone without showering?', 'What is your most-used emoji, and why?', 'Have you ever pretended to be sick to get out of plans?',
      'What’s the most money you’ve wasted on something silly?', 'What is a secret talent nobody here knows about?', 'Who was your first celebrity crush?',
      'What’s the most awkward thing that happened to you at school or work?', 'What is something you’re secretly proud of?', 'What’s the worst film you’ve pretended to like?',
      'Which app do you spend way too much time on?', 'What is your most embarrassing nickname?', 'What’s the pettiest reason you’ve stopped talking to someone?',
      'What would your perfect day look like?', 'Have you ever re-gifted a present? To whom?', 'What is the strangest dream you remember?',
      'What do you always lie about on forms or apps?', 'What is your biggest pet peeve about the person on your left?', 'If you could swap lives with someone here for a day, who would it be?',
      'What is the most trouble you got into as a kid?', 'What’s one thing you would never post online?', 'What is the most embarrassing thing in your search history this month?',
      'What food do you hate that everyone else loves?', 'What’s the dumbest way you’ve injured yourself?', 'What is your worst cooking disaster?',
      'Have you ever been caught talking about someone behind their back?', 'What’s the worst job you’ve had?', 'What is the most expensive thing you’ve broken?',
      'Who here would survive longest in a zombie apocalypse — and who would go first?'
    ],
    spicy: [
      'What is the most spontaneous thing you’ve done on a night out?', 'Who in this room would you most like to go on holiday with?', 'What’s the worst date you’ve ever been on?',
      'Have you ever sent a text to the wrong person? What did it say?', 'What is your biggest turn-off?', 'Who was your last crush?',
      'What’s your most embarrassing drunk story?', 'Have you ever ghosted someone? Why?', 'What is the boldest pick-up line you’ve used or had used on you?',
      'Have you ever had a crush on a friend’s partner?', 'What’s the most rebellious thing you’ve ever done?', 'What is your most regrettable tattoo, piercing or haircut idea?',
      'What’s a secret you’ve kept from your parents?', 'Which ex would you get back with if you had to pick one?', 'What’s the most you’ve ever lied to get out of trouble?',
      'Have you ever stalked an ex online? How far back did you scroll?', 'What’s the cheekiest thing you’ve done at work?', 'What is your hidden red flag?',
      'What’s the longest you’ve gone without replying to someone on purpose?', 'What is the worst thing you’ve said to a partner in an argument?', 'Who here would you call to help hide the evidence?',
      'What is something you’ve done that you’d never want your boss to know?', 'Have you ever been kicked out of somewhere?', 'What’s the most awkward way you’ve been dumped — or dumped someone?',
      'What’s your go-to excuse for leaving a party early?', 'Have you ever had a secret relationship?', 'What’s the most embarrassing thing your phone autocorrected?',
      'Who in this room flirts the most?', 'What is one thing you’ve never told anyone here?', 'What is the worst decision you’ve made after midnight?'
    ],
    couples: [
      'What was your first impression of me?', 'When did you know you liked me?', 'What’s one habit of mine you secretly love?',
      'What’s one habit of mine that drives you mad?', 'What is our best date so far?', 'Where would you take me if money were no object?',
      'What’s something you’ve never told me?', 'What is my most annoying phrase?', 'Who would you say is the better cook — honestly?',
      'What is your favourite photo of us?', 'What’s one thing you’d change about our first date?', 'When do you feel most loved by me?',
      'What’s the silliest argument we’ve had?', 'What is my best quality?', 'What do you think I’m secretly bad at?',
      'What song reminds you of us?', 'What’s a small thing I do that makes your day?', 'If we swapped jobs for a week, how would you do?',
      'What do you think our friends say about us?', 'What adventure should we go on next?', 'What is one thing you want us to try this year?',
      'Who said “I love you” first — and how?', 'What’s the most romantic thing I’ve done?', 'What’s your favourite memory from our first year?',
      'What would our reality TV show be called?'
    ]
  };

  const paranoia = [
    'Who here is most likely to cry at a film?', 'Who here would you call in an emergency?', 'Who here has the best laugh?', 'Who here is the worst driver?',
    'Who here would last longest without their phone?', 'Who here is most likely to be famous one day?', 'Who here would you trust with a secret?', 'Who here is the best dancer?',
    'Who here would survive longest on a desert island?', 'Who here is most likely to get lost on holiday?', 'Who here gives the best advice?', 'Who here is the messiest?',
    'Who here would make the best parent?', 'Who here would win a reality TV show?', 'Who here is the most stubborn?', 'Who here is most likely to adopt ten pets?',
    'Who here would you want on your quiz team?', 'Who here tells the worst jokes?', 'Who here is secretly the smartest?', 'Who here has the best taste in music?',
    'Who here would be the first to fall asleep at a party?', 'Who here is the most competitive?', 'Who here would make the best spy?', 'Who here is most likely to start a fight?',
    'Who here has the most embarrassing phone wallpaper?', 'Who here would you swap wardrobes with?', 'Who here would you never let cook for you?', 'Who here is most likely to text an ex tonight?',
    'Who here is the biggest flirt?', 'Who here would you trust to plan your wedding?', 'Who here is the worst at keeping secrets?', 'Who here is most likely to go viral?',
    'Who here would you want as a flatmate?', 'Who here would you never want as a flatmate?', 'Who here is the best at karaoke?', 'Who here is the most dramatic?',
    'Who here would win in an arm-wrestle?', 'Who here is most likely to be late to their own wedding?', 'Who here would you call to get you out of jail?', 'Who here has the best fashion sense?',
    'Who here would be the worst at keeping a plant alive?', 'Who here is most likely to quit their job tomorrow?', 'Who here has the most secrets?', 'Who here is the best storyteller?',
    'Who here would you want to be stuck in a lift with?', 'Who here would you not want to be stuck in a lift with?', 'Who here has the biggest crush on someone in this room?', 'Who here is the worst at replying to messages?',
    'Who here is most likely to become a millionaire?', 'Who here would be first to leave the party?', 'Who here would make the best teacher?', 'Who here is the worst loser at games?',
    'Who here would you trust to babysit?', 'Who here has the cheesiest chat-up line?', 'Who here would win a staring contest?', 'Who here is the most likely to move abroad?',
    'Who here is the best gift-giver?', 'Who here is the worst gift-giver?', 'Who here is most likely to sing in the shower?', 'Who here would be the funniest drunk?'
  ];

  /* Rule Roulette: [title, text, kind] — kind 'now' happens once; 'rule' stays active until removed. */
  const roulette = [
    ['Waterfall', 'Everyone drinks. Nobody stops until the person to their right stops.', 'now'],
    ['Social', 'Everyone takes a sip.', 'now'],
    ['Give 3', 'Hand out 3 sips however you like.', 'now'],
    ['Take 2', 'You drink 2 sips.', 'now'],
    ['Left neighbour', 'The person on your left drinks 2.', 'now'],
    ['Right neighbour', 'The person on your right drinks 2.', 'now'],
    ['Youngest drinks', 'The youngest player drinks 2.', 'now'],
    ['Oldest drinks', 'The oldest player drinks 2.', 'now'],
    ['Birthday month', 'Everyone born in the same season as you drinks.', 'now'],
    ['Last to stand', 'Everyone stands up — last one up drinks.', 'now'],
    ['Categories', 'Pick a category; go round naming things. First to freeze drinks 2.', 'now'],
    ['Rhyme time', 'Say a word; go round rhyming. First to fail drinks 2.', 'now'],
    ['Never have I ever', 'Say a “never have I ever”. Everyone who has, drinks.', 'now'],
    ['Most likely', 'Ask “who’s most likely to…?” Everyone points on three. Most fingers drinks.', 'now'],
    ['Staring contest', 'Challenge anyone to a staring contest. Loser drinks 2.', 'now'],
    ['Rock, paper, scissors', 'Challenge anyone. Loser drinks 2.', 'now'],
    ['Accent round', 'Tell a 20-second story in an accent. If you laugh, drink.', 'now'],
    ['Phone check', 'Last person to put their phone face-down on the table drinks.', 'now'],
    ['Truth or sip', 'The group asks you one question. Answer honestly or drink 2.', 'now'],
    ['Compliment', 'Give everyone a compliment. Fail to think of one, drink.', 'now'],
    ['Hands up', 'Everyone wearing black drinks.', 'now'],
    ['Glasses', 'Everyone wearing glasses or contacts drinks.', 'now'],
    ['Double up', 'Your next drink counts double.', 'now'],
    ['Safe!', 'Nothing happens. Lucky you.', 'now'],
    ['Water break', 'Everyone has a glass of water. 💧', 'now'],
    ['Thumb master', 'You’re thumb master: put your thumb on the table any time; last to copy drinks.', 'rule'],
    ['Question master', 'Anyone who answers your questions drinks.', 'rule'],
    ['No first names', 'Nobody may use first names. Slip up, drink.', 'rule'],
    ['No pointing', 'No pointing at anything. Slip up, drink.', 'rule'],
    ['No swearing', 'Swear, drink.', 'rule'],
    ['Left hand only', 'Drink with your left hand only.', 'rule'],
    ['Pirate talk', 'Every sentence must end in “arr”.', 'rule'],
    ['Mate', 'Pick a mate: when either of you drinks, both drink.', 'rule'],
    ['No “drink”', 'Nobody may say the word “drink”.', 'rule'],
    ['Royal we', 'Refer to yourself only as “we”.', 'rule'],
    ['Snake eyes', 'Anyone who makes eye contact with you drinks.', 'rule'],
    ['Little green man', 'Before drinking, remove the imaginary man from your glass. Forget, drink again.', 'rule'],
    ['Cheers rule', 'Before anyone drinks, everyone must say “cheers!”', 'rule'],
    ['Floor is lava', 'Feet must stay off the floor when the spinner says “lava!” — last up drinks.', 'rule'],
    ['Silent spinner', 'The spinner can’t speak until their next turn.', 'rule']
  ];

  return { kings, truth, paranoia, roulette };
});

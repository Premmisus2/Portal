// Sales Portal — Splash quote pool
// 49 quotes. SALES register only — no Mafia/business-ops crossover.
// Profanity verbatim (Cardone/Belfort keep their edge). Curated 2026-05-08.

import type { SplashQuote } from './types';

export const SPLASH_QUOTES: SplashQuote[] = [
  // ─────────────────────────────────────────────────────────────
  // GRANT CARDONE — closer / obsession register
  // ─────────────────────────────────────────────────────────────
  { id: 'cardone-obsessed-or-average', text: '“Be obsessed or be average.”', attribution: 'Grant Cardone', source: 'Be Obsessed or Be Average' },
  { id: 'cardone-success-duty', text: '“Success is your duty, obligation, and responsibility.”', attribution: 'Grant Cardone', source: 'The 10X Rule' },
  { id: 'cardone-not-enough-action', text: '“The only problem you will ever have is not enough action.”', attribution: 'Grant Cardone', source: 'The 10X Rule' },
  { id: 'cardone-failure-in-progress', text: '“Average is failure in progress.”', attribution: 'Grant Cardone', source: 'Cardone signature' },
  { id: 'cardone-little-bitch', text: '“Don\'t be a little bitch.”', attribution: 'Grant Cardone', source: 'Cardone signature' },

  // ─────────────────────────────────────────────────────────────
  // JORDAN BELFORT — Wolf-of-Wall-Street register
  // ─────────────────────────────────────────────────────────────
  { id: 'belfort-bullshit-story', text: '“The only thing standing between you and your goal is the bullshit story you keep telling yourself as to why you can\'t achieve it.”', attribution: 'Jordan Belfort', source: 'The Wolf of Wall Street' },
  { id: 'belfort-masters-of-destiny', text: '“Successful people are 100% convinced that they are masters of their own destiny.”', attribution: 'Jordan Belfort', source: 'Way of the Wolf' },

  // ─────────────────────────────────────────────────────────────
  // PATRICK BET-DAVID — strategist / Valuetainment register
  // ─────────────────────────────────────────────────────────────
  { id: 'pbd-choose-enemies', text: '“Choose your enemies wisely. They will define you.”', attribution: 'Patrick Bet-David', source: 'Choose Your Enemies Wisely' },
  { id: 'pbd-speed-implementation', text: '“Speed of implementation is the most important quality in business.”', attribution: 'Patrick Bet-David', source: 'Valuetainment' },
  { id: 'pbd-dont-sell-solve', text: '“Don\'t sell. Solve.”', attribution: 'Patrick Bet-David', source: 'Valuetainment' },
  { id: 'pbd-accept-their-lives', text: '“Most people don\'t lead their lives. They accept their lives.”', attribution: 'Patrick Bet-David', source: 'Your Next Five Moves' },

  // ─────────────────────────────────────────────────────────────
  // ZIG ZIGLAR — sales-craft / persuasion register
  // ─────────────────────────────────────────────────────────────
  { id: 'ziglar-skinny-kids', text: '“Timid salesmen have skinny kids.”', attribution: 'Zig Ziglar', source: 'Secrets of Closing the Sale' },
  { id: 'ziglar-start-to-be-great', text: '“You don\'t have to be great to start, but you have to start to be great.”', attribution: 'Zig Ziglar', source: 'See You at the Top' },
  { id: 'ziglar-emotional-reasons', text: '“People don\'t buy for logical reasons. They buy for emotional reasons.”', attribution: 'Zig Ziglar', source: 'Secrets of Closing the Sale' },
  { id: 'ziglar-attitude-altitude', text: '“Your attitude, not your aptitude, will determine your altitude.”', attribution: 'Zig Ziglar', source: 'Born to Win' },
  { id: 'ziglar-transference-feelings', text: '“Selling is essentially a transference of feelings.”', attribution: 'Zig Ziglar', source: 'Secrets of Closing the Sale' },
  { id: 'ziglar-trust-do-business', text: '“If people like you, they\'ll listen to you. But if they trust you, they\'ll do business with you.”', attribution: 'Zig Ziglar', source: 'Ziglar on Selling' },
  { id: 'ziglar-help-others-get', text: '“You will get all you want in life, if you help enough other people get what they want.”', attribution: 'Zig Ziglar', source: 'See You at the Top' },
  { id: 'ziglar-expect-best', text: '“Expect the best. Prepare for the worst. Capitalize on what comes.”', attribution: 'Zig Ziglar', source: 'Ziglar signature' },

  // ─────────────────────────────────────────────────────────────
  // TOM HOPKINS — closer / craft register
  // ─────────────────────────────────────────────────────────────
  { id: 'hopkins-aim-too-low', text: '“Most people fail in life not because they aim too high and miss, but because they aim too low and hit.”', attribution: 'Tom Hopkins', source: 'How to Master the Art of Selling' },

  // ─────────────────────────────────────────────────────────────
  // RUSSELL BRUNSON — funnel / direct-response register
  // ─────────────────────────────────────────────────────────────
  { id: 'brunson-one-funnel-away', text: '“You\'re one funnel away from changing your life.”', attribution: 'Russell Brunson', source: 'Funnel Hacking Live' },
  { id: 'brunson-riches-in-niches', text: '“The riches are in the niches.”', attribution: 'Russell Brunson', source: 'DotCom Secrets' },

  // ─────────────────────────────────────────────────────────────
  // ALEX HORMOZI — modern offer / leverage register
  // ─────────────────────────────────────────────────────────────
  { id: 'hormozi-hard-choices-easy-life', text: '“Hard choices, easy life. Easy choices, hard life.”', attribution: 'Alex Hormozi', source: '$100M Offers / signature framing' },
  { id: 'hormozi-volume-negates-luck', text: '“The volume negates luck.”', attribution: 'Alex Hormozi', source: 'The Game podcast / signature mantra' },
  { id: 'hormozi-results-or-excuses', text: '“You can have results or excuses. Not both.”', attribution: 'Alex Hormozi', source: 'Hormozi signature' },
  { id: 'hormozi-talent-effort-over-time', text: '“Most things that look like talent are just unrelenting effort over time.”', attribution: 'Alex Hormozi', source: '$100M Offers' },
  { id: 'hormozi-early-do-more', text: '“You don\'t have to be smart. You have to be early, and you have to do more.”', attribution: 'Alex Hormozi', source: '$100M Leads' },
  { id: 'hormozi-pay-the-cost', text: '“The cost of pursuing greatness is everyone else thinking you\'re insane. Pay it.”', attribution: 'Alex Hormozi', source: 'The Game podcast' },

  // ─────────────────────────────────────────────────────────────
  // BRIAN TRACY — discipline / craft register
  // ─────────────────────────────────────────────────────────────
  { id: 'tracy-help-not-sell', text: '“Approach each customer with the idea of helping him or her solve a problem or achieve a goal, not of selling a product or service.”', attribution: 'Brian Tracy', source: 'The Psychology of Selling' },
  { id: 'tracy-expect-to-win', text: '“All successful salespeople have one common quality: they expect to win.”', attribution: 'Brian Tracy', source: 'The Psychology of Selling' },
  { id: 'tracy-successful-habits', text: '“Successful people are simply those with successful habits.”', attribution: 'Brian Tracy', source: 'Million Dollar Habits' },
  { id: 'tracy-comfort-zone', text: '“Move out of your comfort zone. You can only grow if you are willing to feel awkward and uncomfortable when you try something new.”', attribution: 'Brian Tracy', source: 'Eat That Frog!' },
  { id: 'tracy-never-settle', text: '“Never settle for less than your best.”', attribution: 'Brian Tracy', source: 'Maximum Achievement' },
  { id: 'tracy-self-confidence', text: '“The way to develop self-confidence is to do the thing you fear and get a record of successful experiences behind you.”', attribution: 'Brian Tracy', source: 'Goals!' },

  // ─────────────────────────────────────────────────────────────
  // JOE GIRARD — Guinness record / personal-sale register
  // ─────────────────────────────────────────────────────────────
  { id: 'girard-buy-from-person', text: '“People don\'t buy from the company. They buy from the person.”', attribution: 'Joe Girard', source: 'How to Sell Anything to Anybody' },
  { id: 'girard-after-the-sale', text: '“The selling business begins after the sale.”', attribution: 'Joe Girard', source: 'How to Close Every Sale' },

  // ─────────────────────────────────────────────────────────────
  // JIM ROHN — discipline / philosophy register
  // ─────────────────────────────────────────────────────────────
  { id: 'rohn-run-the-day', text: '“Either you run the day or the day runs you.”', attribution: 'Jim Rohn', source: 'Rohn signature' },
  { id: 'rohn-simple-disciplines', text: '“Success is nothing more than a few simple disciplines, practiced every day.”', attribution: 'Jim Rohn', source: 'The Five Major Pieces to the Life Puzzle' },
  { id: 'rohn-be-better', text: '“Don\'t wish it were easier. Wish you were better.”', attribution: 'Jim Rohn', source: 'The Art of Exceptional Living' },
  { id: 'rohn-discipline-or-regret', text: '“We must all suffer one of two things: the pain of discipline or the pain of regret.”', attribution: 'Jim Rohn', source: 'The Art of Exceptional Living' },

  // ─────────────────────────────────────────────────────────────
  // OG MANDINO — persistence / craft register
  // ─────────────────────────────────────────────────────────────
  { id: 'mandino-persist-succeed', text: '“I will persist until I succeed.”', attribution: 'Og Mandino', source: 'The Greatest Salesman in the World' },
  { id: 'mandino-plant-now-harvest', text: '“Always do your best. What you plant now, you will harvest later.”', attribution: 'Og Mandino', source: 'The Greatest Salesman in the World' },

  // ─────────────────────────────────────────────────────────────
  // JEB BLOUNT — prospecting register
  // ─────────────────────────────────────────────────────────────
  { id: 'blount-empty-pipe', text: '“The number one reason for failure in sales is an empty pipe.”', attribution: 'Jeb Blount', source: 'Fanatical Prospecting' },
  { id: 'blount-pipe-is-life', text: '“The pipe is life.”', attribution: 'Jeb Blount', source: 'Fanatical Prospecting' },

  // ─────────────────────────────────────────────────────────────
  // DALE CARNEGIE — influence / craft register
  // ─────────────────────────────────────────────────────────────
  { id: 'carnegie-creatures-of-emotion', text: '“When dealing with people, remember you are not dealing with creatures of logic, but creatures of emotion.”', attribution: 'Dale Carnegie', source: 'How to Win Friends and Influence People' },
  { id: 'carnegie-action-confidence', text: '“Inaction breeds doubt and fear. Action breeds confidence and courage.”', attribution: 'Dale Carnegie', source: 'How to Stop Worrying and Start Living' },
  { id: 'carnegie-interested-in-others', text: '“You can make more friends in two months by becoming interested in other people than you can in two years by trying to get other people interested in you.”', attribution: 'Dale Carnegie', source: 'How to Win Friends and Influence People' },
  { id: 'carnegie-talk-about-themselves', text: '“Talk to someone about themselves and they\'ll listen for hours.”', attribution: 'Dale Carnegie', source: 'How to Win Friends and Influence People' },
  { id: 'carnegie-flatterers', text: '“Don\'t be afraid of enemies who attack you. Be afraid of the friends who flatter you.”', attribution: 'Dale Carnegie', source: 'How to Win Friends and Influence People' },
];

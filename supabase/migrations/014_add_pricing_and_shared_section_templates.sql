-- Migration: 014_add_pricing_and_shared_section_templates.sql
-- Description: Add 8 new section templates for pricing page and shared layouts
-- Created: 2026-03-27

-- 1. Pricing Hero
INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Pricing Hero',
  'pricing_hero',
  '{"eyebrow":"Membership that gives back","headline":"Support that fits your life.","subheadline":"Every membership level helps fund the NFW mission. Choose the level that works for you — and unlock benefits that make a real difference in your everyday life.","trust_badges":["Cancel anytime","Funds go directly to women in need","Join in minutes"],"background":"aubergine"}'::jsonb,
  true
);

-- 2. Pricing Cards
INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Pricing Cards',
  'pricing_cards',
  '{"eyebrow":"Choose your membership","headline":"Choose your membership","subheadline":"Every tier supports the mission. Upgrade anytime as your needs grow.","cards":[{"id":"free","name":"Free Member","price":"$0","period":"forever","description":"A warm welcome to the NFW community.","features":["Access to NFW community","Monthly newsletter","Event notifications","Read member articles and resources"],"highlighted":false,"badge":null},{"id":"contributing","name":"Contributing Member","price":"$15","period":"/year","description":"The most popular way to support NFW and unlock real benefits.","features":["Everything in Free","Apply for microgrants up to $1,000","Member perks and discounts platform","Access to Zero Dollar Store","Voting rights on NFW initiatives","Member badge and recognition"],"highlighted":false,"badge":"Most Popular"},{"id":"founding","name":"Founding Member","price":"$100","period":"/year","description":"For women who want to make the biggest impact on the mission.","features":["Everything in Contributing","Founding member recognition","Early access to events and programs","Direct input on NFW initiatives","Priority grant application review","Exclusive founding member badge"],"highlighted":true,"badge":"Most Impact"}],"checkbox_checked":"green","background":"dove"}'::jsonb,
  true
);

-- 3. Pricing CTA Box
INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Pricing CTA Box',
  'pricing_cta_box',
  '{"headline":"Ready to join?","body":"Create your free account first, then choose your membership level. It only takes a few minutes.","cta_label":"Join Now","cta_url":"/auth/sign-up","secondary_text":"Already a member?","secondary_url":"/auth/login","background":"dove"}'::jsonb,
  true
);

-- 4. Pricing Comparison Table
INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Pricing Comparison Table',
  'pricing_comparison',
  '{"eyebrow":"Everything included","headline":"Compare all benefits","subheadline":"See exactly what''s included at every level.","column1_label":"Free","column2_label":"Contributing","column3_label":"Founding","checkbox_checked":"green","checkbox_unchecked":"blackberry10","benefits":[{"label":"Community access","free":true,"contributing":true,"founding":true},{"label":"Monthly newsletter","free":true,"contributing":true,"founding":true},{"label":"Event notifications","free":true,"contributing":true,"founding":true},{"label":"Articles and resources","free":true,"contributing":true,"founding":true},{"label":"Microgrant applications","free":false,"contributing":true,"founding":true},{"label":"Perks and discounts platform","free":false,"contributing":true,"founding":true},{"label":"Zero Dollar Store access","free":false,"contributing":true,"founding":true},{"label":"Voting rights","free":false,"contributing":true,"founding":true},{"label":"Member badge","free":false,"contributing":true,"founding":true},{"label":"Founding member recognition","free":false,"contributing":false,"founding":true},{"label":"Early access to events","free":false,"contributing":false,"founding":true},{"label":"Direct input on initiatives","free":false,"contributing":false,"founding":true},{"label":"Priority grant review","free":false,"contributing":false,"founding":true}],"background":"dove"}'::jsonb,
  true
);

-- 5. Pricing Benefits
INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Pricing Benefits',
  'pricing_benefits',
  '{"eyebrow":"Why it matters","headline":"Your membership funds the mission","body":"Every dollar from membership goes directly toward funding microgrants, building the perks platform, and advocating for women across the country. When you join, you''re not just getting benefits — you''re helping another woman get the support she needs.\n\nNFW is built on the belief that small, consistent support creates lasting change. Your membership is part of that.","cta_label":"Join the Community","cta_url":"/auth/sign-up","items":[{"title":"$2.5M+ in grants awarded","description":"Member dues directly fund microgrants that help women cover emergency bills, childcare, medical costs and more.","icon_color":"green"},{"title":"50,000+ women supported","description":"A growing community of women across all 50 states finding relief, connection and resources through NFW.","icon_color":"green"},{"title":"1,000+ perks and discounts","description":"Members save an average of $500+ per year on everyday essentials through the NFW perks platform.","icon_color":"green"}],"background":"dove"}'::jsonb,
  true
);

-- 6. Pricing Final CTA
INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Pricing Final CTA',
  'pricing_final_cta',
  '{"headline":"Ready to feel supported?","subheadline":"Join thousands of women who have already found relief, connection and real support through NFW. Your journey starts here.","items":[{"title":"Microgrants","sub":"Up to $1,000 in support","icon_color":"green"},{"title":"Exclusive Perks","sub":"Save $500+ per year","icon_color":"green"},{"title":"Community","sub":"50,000+ women strong","icon_color":"green"}],"cta_label":"Become a Member Today","cta_url":"/auth/sign-up","footnote":"Join in minutes. No credit card required to browse.","background":"aubergine"}'::jsonb,
  true
);

-- 7. How It Works (3 Steps)
INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'How It Works (3 Steps)',
  'how_it_works',
  '{"eyebrow":"Secure, simple and smart","headline":"How it works","subheadline":"Getting support should feel simple.","steps":[{"icon":"FileText","icon_color":"green","title":"Apply in a few minutes","description":"Share the basics of your situation in a short, simple form. No lengthy paperwork."},{"icon":"Eye","icon_color":"yellow","title":"We review your request","description":"A real person looks at your application with care. Most reviews happen within 48 hours."},{"icon":"Banknote","icon_color":"blue","title":"Funds are sent securely","description":"If approved, your grant is delivered by bank transfer or digital wallet — fast."}],"background":"wisteria"}'::jsonb,
  true
);

-- 8. Benefits with Checkmarks
INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  'Benefits with Checkmarks',
  'benefits_checkmarks',
  '{"eyebrow":"Made for real life","headline":"Why members love them","body":"Perks are built to make everyday life easier. Members use them to save money on the things they already buy, discover helpful offers and find small moments of relief throughout the week.","benefits":[{"check_color":"green","title":"Real savings you can feel","description":"Many members save more than their membership cost. Discounts on essentials help your budget stretch further."},{"check_color":"yellow","title":"Helpful for everyday life","description":"Perks cover things you use every day like groceries, health items and childcare bringing quick relief when life feels busy."},{"check_color":"blue","title":"New deals added often","description":"Fresh offers are added throughout the month so there is always something helpful to claim and enjoy."}],"cta_label":"Become a Member","cta_url":"/auth/sign-up","background":"dove"}'::jsonb,
  true
);

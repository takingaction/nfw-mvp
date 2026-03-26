import { SectionType } from "./types";

// ── Editor field definitions ──────────────────────────────────
// Used by the admin panel to render the correct inputs per section type

export type EditorField =
  | { key: string; label: string; type: "text" }
  | { key: string; label: string; type: "textarea" }
  | { key: string; label: string; type: "richtext" }
  | { key: string; label: string; type: "url" }
  | { key: string; label: string; type: "image" }
  | { key: string; label: string; type: "video" }
  | { key: string; label: string; type: "boolean" }
  | { key: string; label: string; type: "select"; options: string[] }
  | { key: string; label: string; type: "string-array"; itemLabel: string }
  | {
      key: string;
      label: string;
      type: "array";
      itemLabel: string;
      fields: EditorField[];
    };

export interface SectionDefinition {
  type: SectionType;
  label: string;
  defaultContent: Record<string, unknown>;
  editorFields: EditorField[];
  // component is dynamically imported in SectionRenderer
  // to avoid importing all components at registry load time
}

export const SECTION_REGISTRY: Record<SectionType, SectionDefinition> = {
  hero: {
    type: "hero",
    label: "Hero",
    defaultContent: {
      eyebrow: "Join thousands of members nationwide",
      headline: "A National membership built for American women.",
      headline_italic_phrase: "membership",
      subheadline: "Real support. Real savings. Real advocacy. $15 a year.",
      cta_primary_label: "Become a Member",
      cta_primary_url: "/auth/sign-up",
      cta_secondary_label: "Learn More",
      cta_secondary_url: "/about",
      images: [],
    },
    editorFields: [
      { key: "eyebrow", label: "Eyebrow text", type: "text" },
      { key: "headline", label: "Headline", type: "text" },
      {
        key: "headline_italic_phrase",
        label: "Italic phrase in headline",
        type: "text",
      },
      { key: "subheadline", label: "Subheadline", type: "text" },
      { key: "cta_primary_label", label: "Primary CTA label", type: "text" },
      { key: "cta_primary_url", label: "Primary CTA URL", type: "url" },
      {
        key: "cta_secondary_label",
        label: "Secondary CTA label",
        type: "text",
      },
      { key: "cta_secondary_url", label: "Secondary CTA URL", type: "url" },
      { key: "images", label: "Hero image", type: "image" },
    ],
  },

  hero_video: {
    type: "hero_video",
    label: "Hero (Video)",
    defaultContent: {
      eyebrow: "Join thousands of members nationwide",
      headline: "A National membership built for American women.",
      headline_italic_phrase: "membership",
      subheadline: "Real support. Real savings. Real advocacy. $15 a year.",
      cta_primary_label: "Become a Member",
      cta_primary_url: "/auth/sign-up",
      cta_secondary_label: "Learn More",
      cta_secondary_url: "/about",
      video_url: "",
      poster_image_url: "",
      autoplay: true,
      muted: true,
      loop: true,
      plays_inline: true,
      show_controls: false,
      object_fit: "cover",
    },
    editorFields: [
      { key: "eyebrow", label: "Eyebrow text", type: "text" },
      { key: "headline", label: "Headline", type: "text" },
      {
        key: "headline_italic_phrase",
        label: "Italic phrase in headline",
        type: "text",
      },
      { key: "subheadline", label: "Subheadline", type: "text" },
      { key: "cta_primary_label", label: "Primary CTA label", type: "text" },
      { key: "cta_primary_url", label: "Primary CTA URL", type: "url" },
      {
        key: "cta_secondary_label",
        label: "Secondary CTA label",
        type: "text",
      },
      { key: "cta_secondary_url", label: "Secondary CTA URL", type: "url" },
      { key: "video_url", label: "Video (MP4)", type: "video" },
      { key: "poster_image_url", label: "Poster image (optional)", type: "image" },
      { key: "autoplay", label: "Autoplay video", type: "boolean" },
      { key: "muted", label: "Mute video", type: "boolean" },
      { key: "loop", label: "Loop video", type: "boolean" },
      { key: "plays_inline", label: "Plays inline (mobile)", type: "boolean" },
      { key: "show_controls", label: "Show playback controls", type: "boolean" },
      { key: "object_fit", label: "Video fit", type: "select", options: ["cover", "contain"] },
    ],
  },

  stats_bar: {
    type: "stats_bar",
    label: "Stats Bar",
    defaultContent: {
      eyebrow: "Real support. Real results.",
      stats: [
        { value: "0", label: "Active Members" },
        { value: "0", label: "Grants Awarded" },
        { value: "0", label: "States Represented" },
        { value: "0", label: "Perks & Discounts" },
      ],
    },
    editorFields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      {
        key: "stats",
        label: "Stats",
        type: "array",
        itemLabel: "Stat",
        fields: [
          { key: "value", label: "Value (e.g. 50,000+)", type: "text" },
          { key: "label", label: "Label", type: "text" },
        ],
      },
    ],
  },

  mission_quote: {
    type: "mission_quote",
    label: "Mission Quote",
    defaultContent: {
      eyebrow: "WHO WE ARE",
      quote_text:
        "The National Fund for Women seeks to enhance the quality of life for all American women by championing positive social change and delivering value through resources, information, and advocacy.",
    },
    editorFields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "quote_text", label: "Quote text", type: "textarea" },
    ],
  },

  three_col_features: {
    type: "three_col_features",
    label: "Three Column Features",
    defaultContent: {
      columns: [
        {
          eyebrow: "MICROGRANTS",
          heading: "Direct support when it matters most",
          body: "Financial assistance designed to reduce pressure — not create more of it.",
          bullets: [
            "Assistance for rent, utilities, and childcare",
            "Support for unexpected expenses",
            "Streamlined application designed to feel supportive",
          ],
          cta_label: "Learn More About Microgrants",
          cta_url: "/grants",
          background_image_url: "",
        },
        {
          eyebrow: "MEMBERSHIP SAVINGS",
          heading: "Meaningful savings on what you already buy",
          body: "Exclusive member discounts on everyday essentials.",
          bullets: [
            "Discounts on groceries, gas, and essentials",
            "Exclusive deals on travel and dining",
            "Savings that add up to hundreds per year",
          ],
          cta_label: "Explore Membership Savings",
          cta_url: "/perks",
          background_image_url: "",
        },
        {
          eyebrow: "ZERO DOLLAR STORE",
          heading: "Access essentials without added burden",
          body: "Free items you can claim anytime — no questions, no judgment.",
          bullets: [
            "Hygiene products, household items, and more",
            "No purchase required",
            "Restocked regularly with new items",
          ],
          cta_label: "Visit the Zero Dollar Store",
          cta_url: "/store",
          background_image_url: "",
        },
      ],
    },
    editorFields: [
      {
        key: "columns",
        label: "Columns",
        type: "array",
        itemLabel: "Column",
        fields: [
          { key: "eyebrow", label: "Eyebrow", type: "text" },
          { key: "heading", label: "Heading", type: "text" },
          { key: "body", label: "Body", type: "textarea" },
          {
            key: "background_image_url",
            label: "Background image",
            type: "image",
          },
          {
            key: "bullets",
            label: "Bullet points",
            type: "string-array",
            itemLabel: "Bullet",
          },
          { key: "cta_label", label: "CTA label", type: "text" },
          { key: "cta_url", label: "CTA URL", type: "url" },
        ],
      },
    ],
  },

  split_why_nfw: {
    type: "split_why_nfw",
    label: "Split — Why NFW",
    defaultContent: {
      eyebrow: "WHY NFW",
      headline: "Built for women's real lives.",
      headline_italic_phrase: "real",
      body: "The National Fund for Women is a financially independent membership organization built around women's everyday economic realities. Membership delivers tangible savings and support now — while building durable infrastructure to advocate for women at scale.",
      cta_label: "Become a Member",
      cta_url: "/auth/sign-up",
      pullquote:
        "Women drive the economy, control most household spending, and shoulder the majority of caregiving — yet no permanent institution exists to represent their shared economic interests.",
    },
    editorFields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "headline", label: "Headline", type: "text" },
      { key: "headline_italic_phrase", label: "Italic phrase", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
      { key: "cta_label", label: "CTA label", type: "text" },
      { key: "cta_url", label: "CTA URL", type: "url" },
      { key: "pullquote", label: "Pull quote", type: "textarea" },
    ],
  },

  microgrant_feature: {
    type: "microgrant_feature",
    label: "Microgrant Feature",
    defaultContent: {
      eyebrow: "MICROGRANTS",
      headline: "Real help when life gets hard.",
      headline_italic_phrase: "hard",
      body: "Unexpected expenses happen. Our microgrants provide quick financial support when you need it most — with a simple application designed to feel supportive, not transactional.",
      cta_label: "Learn About Microgrants",
      cta_url: "/grants",
      image_url: "",
    },
    editorFields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "headline", label: "Headline", type: "text" },
      { key: "headline_italic_phrase", label: "Italic phrase", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
      { key: "cta_label", label: "CTA label", type: "text" },
      { key: "cta_url", label: "CTA URL", type: "url" },
      { key: "image_url", label: "Photo", type: "image" },
    ],
  },

  perks_feature: {
    type: "perks_feature",
    label: "Perks Feature + Brand Logos",
    defaultContent: {
      eyebrow: "PERKS & DISCOUNTS",
      headline: "Everyday savings you can feel.",
      headline_italic_phrase: "feel",
      body: "Members get access to thousands of discounts on things you already buy — real savings that make your budget stretch further.",
      cta_label: "Explore Perks & Discounts",
      cta_url: "/perks",
      logo_strip_eyebrow: "BRANDS SHOWING UP FOR WOMEN",
      logos: [],
      background: "wisteria",
    },
    editorFields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "headline", label: "Headline", type: "text" },
      { key: "headline_italic_phrase", label: "Italic phrase", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
      { key: "cta_label", label: "CTA label", type: "text" },
      { key: "cta_url", label: "CTA URL", type: "url" },
      { key: "logo_strip_eyebrow", label: "Logo strip eyebrow", type: "text" },
      { key: "background", label: "Background", type: "select", options: ["dove", "aubergine", "wisteria", "blackberry"] },
      {
        key: "logos",
        label: "Brand logos",
        type: "array",
        itemLabel: "Brand",
        fields: [
          { key: "name", label: "Brand name", type: "text" },
          { key: "image_url", label: "Logo image", type: "image" },
        ],
      },
    ],
  },

  zero_dollar_store_teaser: {
    type: "zero_dollar_store_teaser",
    label: "Zero Dollar Store Teaser",
    defaultContent: {
      eyebrow: "ZERO DOLLAR STORE",
      headline: "Free items you can claim anytime.",
      headline_italic_phrase: "anytime",
      body: "Sometimes you just need a little something to get by. Our Zero Dollar Store lets you claim free essentials whenever you need them — no questions, no judgment.",
      cta_label: "Shop",
      cta_url: "/store",
      products: [],
    },
    editorFields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "headline", label: "Headline", type: "text" },
      { key: "headline_italic_phrase", label: "Italic phrase", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
      { key: "cta_label", label: "CTA label", type: "text" },
      { key: "cta_url", label: "CTA URL", type: "url" },
      {
        key: "products",
        label: "Featured products",
        type: "array",
        itemLabel: "Product",
        fields: [
          { key: "name", label: "Product name", type: "text" },
          { key: "image_url", label: "Product image", type: "image" },
          {
            key: "retail_price",
            label: "Retail price (e.g. From $24)",
            type: "text",
          },
        ],
      },
    ],
  },

  split_everyday: {
    type: "split_everyday",
    label: "Split — Everyday Realities",
    defaultContent: {
      eyebrow: "WOMEN'S ECONOMIC REALITIES",
      headline: "Everyday realities deserve lasting support.",
      headline_italic_phrase: "lasting",
      body: "NFW is built around the real logistics of women's lives — the budgeting, the quiet decisions that keep households running.",
      cta_label: "Join Now",
      cta_url: "/auth/sign-up",
      image_url: "",
      image_side: "left",
    },
    editorFields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "headline", label: "Headline", type: "text" },
      { key: "headline_italic_phrase", label: "Italic phrase", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
      { key: "cta_label", label: "CTA label", type: "text" },
      { key: "cta_url", label: "CTA URL", type: "url" },
      { key: "image_url", label: "Image", type: "image" },
      {
        key: "image_side",
        label: "Image side",
        type: "select",
        options: ["left", "right"],
      },
    ],
  },

  testimonials: {
    type: "testimonials",
    label: "Testimonials",
    defaultContent: {
      eyebrow: "MEMBER STORIES",
      heading: "Real women. Real impact.",
      testimonials: [],
      background: "dove",
    },
    editorFields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      {
        key: "background",
        label: "Background",
        type: "select",
        options: ["dove", "aubergine", "wisteria", "blackberry"],
      },
      {
        key: "testimonials",
        label: "Testimonials",
        type: "array",
        itemLabel: "Testimonial",
        fields: [
          { key: "quote", label: "Quote", type: "textarea" },
          { key: "first_name", label: "First name", type: "text" },
          { key: "age", label: "Age", type: "text" },
          { key: "state", label: "State", type: "text" },
        ],
      },
    ],
  },

  faq: {
    type: "faq",
    label: "FAQ",
    defaultContent: {
      eyebrow: "QUESTIONS",
      heading: "Questions? We've got answers.",
      items: [
        {
          question: "How much does membership cost?",
          answer: "NFW membership starts free.",
        },
        {
          question: "How do microgrants work?",
          answer: "Members can apply for microgrants up to $1,000.",
        },
      ],
    },
    editorFields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      {
        key: "items",
        label: "FAQ items",
        type: "array",
        itemLabel: "Question",
        fields: [
          { key: "question", label: "Question", type: "text" },
          { key: "answer", label: "Answer", type: "richtext" },
        ],
      },
    ],
  },

  membership_cta: {
    type: "membership_cta",
    label: "Membership CTA",
    defaultContent: {
      eyebrow: "MEMBERSHIP",
      headline: "Membership starts here.",
      headline_italic_phrase: "starts",
      body: "For $15 per year, membership delivers immediate value while building long-term advocacy power. NFW is funded by members and partnerships — not donor cycles.",
      price: "$15",
      price_period: "per year",
      benefits: [
        "Access to grants, exclusive perks & discounts",
        "Eligibility for microgrants — rent, utilities, childcare",
        "Free items from the Zero Dollar Store",
        "Connection to a national community of women",
        "Your membership funds advocacy for women",
      ],
      cta_label: "Start Your Membership",
      cta_url: "/auth/sign-up",
    },
    editorFields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "headline", label: "Headline", type: "text" },
      { key: "headline_italic_phrase", label: "Italic phrase", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
      { key: "price", label: "Price", type: "text" },
      { key: "price_period", label: "Price period", type: "text" },
      {
        key: "benefits",
        label: "Benefits",
        type: "array",
        itemLabel: "Benefit",
        fields: [{ key: "text", label: "Benefit text", type: "text" }],
      },
      { key: "cta_label", label: "CTA label", type: "text" },
      { key: "cta_url", label: "CTA URL", type: "url" },
    ],
  },

  right_side_3_features: {
    type: "right_side_3_features",
    label: "Right Side 3 Features",
    defaultContent: {
      eyebrow: "Why we exist",
      headline: "Real support for real life moments",
      body: "Women across America are navigating rising costs, caregiving pressures, wage gaps, and unexpected emergencies — often without a safety net. NFW was created to change that.\n\nWe believe that small, consistent support creates lasting change. Through microgrants, exclusive perks, and a community that truly gets it, we help women find relief — not someday, but today.",
      cta_label: "Join the Community",
      cta_url: "/auth/sign-up",
      background: "dove",
      items: [
        {
          bg: "citrine",
          title: "Celebrate every woman",
          description: "We uplift and affirm all women — through daily life moments, feel-good content, and a community that champions your wins big and small.",
        },
        {
          bg: "lilac",
          title: "Provide relief you can feel",
          description: "From microgrants to perks to the Zero Dollar Store, every benefit is designed to ease real pressure in your everyday life.",
        },
        {
          bg: "powder",
          title: "Champion shared interests",
          description: "NFW advocates for women at the individual level and the collective level — because what's good for one woman is good for all of us.",
        },
      ],
    },
    editorFields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "headline", label: "Headline", type: "text" },
      { key: "body", label: "Body (2 paragraphs)", type: "textarea" },
      { key: "cta_label", label: "CTA label", type: "text" },
      { key: "cta_url", label: "CTA URL", type: "url" },
      { key: "background", label: "Background", type: "select", options: ["dove", "aubergine", "wisteria", "blackberry"] },
      {
        key: "items",
        label: "Feature items",
        type: "array",
        itemLabel: "Item",
        fields: [
          { key: "bg", label: "Background color", type: "select", options: ["yellow", "green", "blue", "lavender", "citrine", "lilac", "powder"] },
          { key: "title", label: "Title", type: "text" },
          { key: "description", label: "Description", type: "textarea" },
        ],
      },
    ],
  },

  "4_cards": {
    type: "4_cards",
    label: "4 Cards",
    defaultContent: {
      eyebrow: "Our community",
      headline: "Women at every stage of life",
      subheadline: "NFW membership is open to all women 18 and older residing in the United States. We welcome women from all backgrounds and circumstances.",
      cards: [
        {
          color: "yellow",
          age: "18-34",
          title: "Young Women",
          description: "Navigating cost of living, student debt, and building a future in a complicated world.",
        },
        {
          color: "green",
          age: "All ages",
          title: "Moms of Young Kids",
          description: "Balancing childcare costs, limited time, and the daily demands of raising a family.",
        },
        {
          color: "blue",
          age: "Gen X",
          title: "Moms of Older Kids",
          description: "Managing college prep, work-life balance, and caring for loved ones all at once.",
        },
        {
          color: "lavender",
          age: "55+",
          title: "Grandmas and Elders",
          description: "Living on fixed incomes while supporting the next generation and leaving a legacy.",
        },
      ],
    },
    editorFields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "headline", label: "Headline", type: "text" },
      { key: "subheadline", label: "Subheadline", type: "textarea" },
      {
        key: "cards",
        label: "Cards",
        type: "array",
        itemLabel: "Card",
        fields: [
          { key: "color", label: "Color", type: "select", options: ["yellow", "green", "blue", "lavender", "citrine", "lilac", "powder"] },
          { key: "age", label: "Age label", type: "text" },
          { key: "title", label: "Title", type: "text" },
          { key: "description", label: "Description", type: "textarea" },
        ],
      },
    ],
  },

  "3_cards": {
    type: "3_cards",
    label: "3 Cards",
    defaultContent: {
      eyebrow: "What membership includes",
      headline: "Everything you need. Nothing you don't.",
      background: "dove",
      cards: [
        {
          color: "green",
          title: "Microgrants",
          description: "Apply for grants from $100 to $5,000 to cover emergency bills, childcare, medical costs, car repairs, and more. Real people review every application within 48 hours.",
          link: "/grants",
          cta: "Learn about grants",
        },
        {
          color: "blue",
          title: "Perks and Discounts",
          description: "Access 1,000+ member-only deals on groceries, wellness, travel, childcare, and everyday essentials. Members save an average of $500+ per year.",
          link: "/perks/info",
          cta: "Explore perks",
        },
        {
          color: "yellow",
          title: "Zero Dollar Store",
          description: "Claim free essential items whenever you need them — hygiene products, household items, and more. No questions asked, no judgment.",
          link: "/store",
          cta: "Visit the store",
        },
      ],
    },
    editorFields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "headline", label: "Headline", type: "text" },
      { key: "background", label: "Background", type: "select", options: ["dove", "aubergine", "wisteria", "blackberry"] },
      {
        key: "cards",
        label: "Cards",
        type: "array",
        itemLabel: "Card",
        fields: [
          { key: "color", label: "Color", type: "select", options: ["yellow", "green", "blue", "lavender", "citrine", "lilac", "powder"] },
          { key: "title", label: "Title", type: "text" },
          { key: "description", label: "Description", type: "textarea" },
          { key: "link", label: "Link URL", type: "url" },
          { key: "cta", label: "CTA text", type: "text" },
        ],
      },
    ],
  },
};

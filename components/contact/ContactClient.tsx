"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Clock, Heart } from "lucide-react";

interface HelpCard {
  icon: string;
  title: string;
  content: string;
  email?: string;
}

interface QuickLink {
  label: string;
  url: string;
}

interface ContactData {
  id: string;
  hero_eyebrow: string;
  hero_headline: string;
  hero_subheadline: string;
  help_heading: string;
  help_intro: string;
  help_cards: HelpCard[];
  quick_links: QuickLink[];
  not_member_heading: string;
  not_member_subheading: string;
}

const defaultData: ContactData = {
  id: "",
  hero_eyebrow: "Real people, real responses",
  hero_headline: "We'd love to hear from you.",
  hero_subheadline: "Whether you have a question, need support, or just want to say hi — we're here and we're listening.",
  help_heading: "How can we help?",
  help_intro: "Our team is made up of real women who care deeply about this community. We read every message and do our best to respond within one business day.",
  help_cards: [
    {
      icon: "mail",
      title: "Email us directly",
      content: "We typically respond within one business day. For urgent grant-related questions, please note that in your message.",
      email: "michelle@nationalfundforwomen.org",
    },
    {
      icon: "clock",
      title: "Response time",
      content: "We typically respond within one business day. For urgent grant-related questions, please note that in your message.",
    },
    {
      icon: "heart",
      title: "A note from us",
      content: "No question is too small. Whether you need help with your account, have a grant question, or just want to share your story — we want to hear it.",
    },
  ],
  quick_links: [
    { label: "Microgrant FAQs", url: "/faq" },
    { label: "Pricing and Plans", url: "/pricing" },
    { label: "Perks and Discounts", url: "/perks/info" },
    { label: "Apply for a Grant", url: "/grants/apply" },
  ],
  not_member_heading: "Not a member yet?",
  not_member_subheading: "Join thousands of women who have already found relief, connection, and real support through NFW. It's free to get started.",
};

export default function ContactClient({ contactData }: { contactData: ContactData | null }) {
  const data = contactData || defaultData;
  const searchParams = useSearchParams();
  const isFreeMembershipRequest = searchParams.get("reason") === "free-membership";
  const fromLogin = searchParams.get("from") === "login";
  const fromAbandoned = searchParams.get("from") === "abandoned";
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      await fetch("/api/contact/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          subject: formData.get("subject"),
          message: formData.get("message"),
          website: formData.get("website"),
          from_abandoned: fromAbandoned,
        }),
      });
    } catch {
    }
    setSubmitted(true);
    setLoading(false);
  };

  const renderCardIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case "mail":
        return <Mail className={className} />;
      case "clock":
        return <Clock className={className} />;
      case "heart":
        return <Heart className={className} />;
      default:
        return <Mail className={className} />;
    }
  };

  return (
    <main className="min-h-screen bg-nfw-dove">
      {/* HERO */}
      <div className="bg-nfw-aubergine">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
          <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-dove mb-6">
            {data.hero_eyebrow}
          </p>
          <h1 className="font-serif text-4xl lg:text-6xl text-nfw-dove mb-6 leading-tight">
            {data.hero_headline}
          </h1>
          <p className="font-serif text-xl text-nfw-dove max-w-2xl mx-auto">
            {data.hero_subheadline}
          </p>
        </div>
      </div>

      {/* CONTACT SECTION */}
      <div className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left — Info */}
            <div className="space-y-8">
              <div>
                <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-3">
                  Get in touch
                </p>
                <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-4 leading-tight">
                  {isFreeMembershipRequest ? "Free Membership Request" : data.help_heading}
                </h2>
                <p className="font-serif text-lg text-nfw-blackberry/70 leading-relaxed">
                  {isFreeMembershipRequest && fromLogin
                    ? "Welcome back! Please complete your free membership request below. Our team will review your application and contact you once approved."
                    : isFreeMembershipRequest && fromAbandoned
                    ? "No problem! You can still request free membership below. Our team will review your application and contact you once approved."
                    : isFreeMembershipRequest
                    ? "You're requesting free membership. Our team will review your application and contact you once approved. Please tell us a little about yourself below."
                    : data.help_intro}
                </p>
              </div>

              {/* Contact Cards */}
              <div className="space-y-4">
                {data.help_cards.map((card, index) => (
                  <div key={index} className="flex items-start gap-4 p-5 border border-nfw-blackberry/10 bg-nfw-lilac/20">
                    <div className="flex-shrink-0 w-10 h-10 bg-nfw-lilac flex items-center justify-center">
                      {renderCardIcon(card.icon, "w-5 h-5 text-nfw-blackberry")}
                    </div>
                    <div>
                      <p className="font-serif text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-1">
                        {card.title}
                      </p>
                      {card.email ? (
                        <a
                          href={`mailto:${card.email}`}
                          className="font-ui text-sm text-nfw-blackberry/70 hover:text-nfw-blackberry transition-colors underline"
                        >
                          {card.email}
                        </a>
                      ) : (
                        <p className="font-serif text-sm text-nfw-blackberry/70">
                          {card.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Links */}
              <div>
                <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-4">
                  Looking for something specific?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {data.quick_links.map((link, index) => (
                    <Link
                      key={index}
                      href={link.url}
                      className="flex items-center gap-2 p-3 border border-nfw-blackberry/10 font-ui text-sm text-nfw-blackberry hover:bg-nfw-lilac/10 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 bg-nfw-lilac rounded-full flex-shrink-0"></span>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Form */}
            <div>
              <div className="border-2 border-nfw-blackberry/10 p-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-nfw-lilac flex items-center justify-center mx-auto mb-6">
                      <img
                        src="/images/nfw-symbol-brandmark-aubergine.png"
                        alt="NFW"
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <h3 className="font-serif text-2xl text-nfw-aubergine mb-3">
                      {isFreeMembershipRequest ? "Request Received!" : "Success!"}
                    </h3>
                    <p className="font-serif text-nfw-blackberry/60">
                      {isFreeMembershipRequest
                        ? "Thank you for your free membership request. Our team will review your application and send you an email once approved."
                        : "We will get back to you within 2-3 business days."}
                    </p>
                  </div>
                  ) : (
                    <>
                      <h3 className="font-ui text-lg font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-6">
                        {isFreeMembershipRequest ? "Submit your request" : "Send us a message"}
                      </h3>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-ui text-sm font-medium text-nfw-blackberry mb-2">
                            Your name
                          </label>
                          <input
                            type="text"
                            name="name"
                            required
                            value={form.name}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, name: e.target.value }))
                            }
                            placeholder="First name"
                            className="w-full px-4 py-3 border border-nfw-blackberry/20 font-sans text-sm text-nfw-blackberry placeholder-nfw-blackberry/30 focus:outline-none focus:border-nfw-aubergine transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block font-ui text-sm font-medium text-nfw-blackberry mb-2">
                            Email address
                          </label>
                          <input
                            type="email"
                            name="email"
                            required
                            value={form.email}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, email: e.target.value }))
                            }
                            placeholder="you@email.com"
                            className="w-full px-4 py-3 border border-nfw-blackberry/20 font-sans text-sm text-nfw-blackberry placeholder-nfw-blackberry/30 focus:outline-none focus:border-nfw-aubergine transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-ui text-sm font-medium text-nfw-blackberry mb-2">
                          What&apos;s this about?
                        </label>
                        <select
                          name="subject"
                          required
                          value={isFreeMembershipRequest ? "free-membership" : form.subject}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, subject: e.target.value }))
                          }
                          className="w-full px-4 py-3 border border-nfw-blackberry/20 font-sans text-sm text-nfw-blackberry focus:outline-none focus:border-nfw-aubergine transition-colors bg-white"
                        >
                          <option value="">Select a topic</option>
                          {isFreeMembershipRequest && (
                            <option value="free-membership">
                              Free Membership Request
                            </option>
                          )}
                          <option value="microgrant">
                            Microgrant question
                          </option>
                          <option value="membership">
                            Membership and billing
                          </option>
                          <option value="perks">Perks and discounts</option>
                          <option value="store">Zero Dollar Store</option>
                          <option value="account">My account</option>
                          <option value="partnership">
                            Partnership inquiry
                          </option>
                          <option value="press">Press and media</option>
                          <option value="other">Something else</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-ui text-sm font-medium text-nfw-blackberry mb-2">
                          Your message
                        </label>
                        <textarea
                          name="message"
                          required
                          rows={5}
                          value={form.message}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, message: e.target.value }))
                          }
                          placeholder="Tell us what's on your mind. We're listening."
                          className="w-full px-4 py-3 border border-nfw-blackberry/20 font-sans text-sm text-nfw-blackberry placeholder-nfw-blackberry/30 focus:outline-none focus:border-nfw-aubergine transition-colors resize-none"
                        />
                      </div>

                      {/* Honeypot field - hidden from users, catches bots */}
                      <input
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        className="absolute -left-[9999px] w-1 h-1 opacity-0 pointer-events-none"
                        placeholder="Leave this blank if you're human"
                      />

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-nfw-aubergine text-nfw-dove font-ui text-sm font-black tracking-[0.06em] uppercase hover:bg-nfw-blackberry transition-colors disabled:opacity-60"
                      >
                        {loading ? "Sending..." : "Send Message"}
                      </button>

                      <p className="font-ui text-xs text-nfw-blackberry/40 text-center">
                        We never share your information with third parties.
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <div className="bg-nfw-dove py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl text-nfw-aubergine mb-4">
            {data.not_member_heading}
          </h2>
          <p className="font-serif text-nfw-blackberry/60 mb-8 text-lg max-w-xl mx-auto">
            {data.not_member_subheading}
          </p>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center justify-center px-10 py-4 bg-nfw-aubergine text-nfw-dove font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-blackberry transition-colors"
          >
            JOIN TODAY
          </Link>
        </div>
      </div>
    </main>
  );
}
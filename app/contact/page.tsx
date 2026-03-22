"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MessageCircle, Clock, Heart } from "lucide-react";

export default function ContactPage() {
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
    await new Promise((r) => setTimeout(r, 1000));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-nfw-dove">
      {/* HERO */}
      <div className="bg-nfw-aubergine">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
          <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-dove mb-6">
            Real people, real responses
          </p>
          <h1 className="font-serif text-4xl lg:text-6xl text-nfw-dove mb-6 leading-tight">
            We&apos;d love to hear from you.
          </h1>
          <p className="font-serif text-xl text-nfw-dove max-w-2xl mx-auto">
            Whether you have a question, need support, or just want to say hi —
            we&apos;re here and we&apos;re listening.
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
                  How can we help?
                </h2>
                <p className="font-sans text-lg text-nfw-blackberry/70 leading-relaxed">
                  Our team is made up of real women who care deeply about this
                  community. We read every message and do our best to respond
                  within one business day.
                </p>
              </div>

              {/* Contact Cards */}
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-5 border border-nfw-blackberry/10 bg-nfw-lilac/20">
                  <div className="flex-shrink-0 w-10 h-10 bg-nfw-lilac flex items-center justify-center">
                    <Mail className="w-5 h-5 text-nfw-blackberry" />
                  </div>
                  <div>
                    <p className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-1">
                      Email us directly
                    </p>
                    <a
                      href="mailto:michelle@nationalfundforwomen.org"
                      className="font-sans text-sm text-nfw-blackberry/70 hover:text-nfw-blackberry transition-colors underline"
                    >
                      michelle@nationalfundforwomen.org
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 border border-nfw-blackberry/10 bg-nfw-lilac/20">
                  <div className="flex-shrink-0 w-10 h-10 bg-nfw-lilac flex items-center justify-center">
                    <Clock className="w-5 h-5 text-nfw-blackberry" />
                  </div>
                  <div>
                    <p className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-1">
                      Response time
                    </p>
                    <p className="font-sans text-sm text-nfw-blackberry/70">
                      We typically respond within one business day. For urgent
                      grant-related questions, please note that in your message.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 border border-nfw-blackberry/10 bg-nfw-lilac/20">
                  <div className="flex-shrink-0 w-10 h-10 bg-nfw-lilac flex items-center justify-center">
                    <Heart className="w-5 h-5 text-nfw-blackberry" />
                  </div>
                  <div>
                    <p className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-1">
                      A note from us
                    </p>
                    <p className="font-sans text-sm text-nfw-blackberry/70">
                      No question is too small. Whether you need help with your
                      account, have a grant question, or just want to share your
                      story — we want to hear it.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-4">
                  Looking for something specific?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Microgrant FAQs", href: "/faq" },
                    { label: "Pricing and Plans", href: "/pricing" },
                    { label: "Perks and Discounts", href: "/perks/info" },
                    { label: "Apply for a Grant", href: "/grants/apply" },
                  ].map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="flex items-center gap-2 p-3 border border-nfw-blackberry/10 font-sans text-sm text-nfw-blackberry hover:bg-nfw-lilac/10 transition-colors"
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
                    <div className="w-16 h-16 bg-[#d4f1ad] flex items-center justify-center mx-auto mb-6">
                      <MessageCircle className="w-8 h-8 text-nfw-blackberry" />
                    </div>
                    <h3 className="font-serif text-2xl text-nfw-aubergine mb-3">
                      Message received!
                    </h3>
                    <p className="font-sans text-nfw-blackberry/60 mb-6">
                      Thank you for reaching out. We&apos;ll get back to you
                      within one business day.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setForm({
                          name: "",
                          email: "",
                          subject: "",
                          message: "",
                        });
                      }}
                      className="font-sans text-sm text-nfw-blackberry hover:text-nfw-aubergine underline transition-colors"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="font-ui text-lg font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-6">
                      Send us a message
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-sans text-sm font-medium text-nfw-blackberry mb-2">
                            Your name
                          </label>
                          <input
                            type="text"
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
                          <label className="block font-sans text-sm font-medium text-nfw-blackberry mb-2">
                            Email address
                          </label>
                          <input
                            type="email"
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
                        <label className="block font-sans text-sm font-medium text-nfw-blackberry mb-2">
                          What&apos;s this about?
                        </label>
                        <select
                          required
                          value={form.subject}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, subject: e.target.value }))
                          }
                          className="w-full px-4 py-3 border border-nfw-blackberry/20 font-sans text-sm text-nfw-blackberry focus:outline-none focus:border-nfw-aubergine transition-colors bg-white"
                        >
                          <option value="">Select a topic</option>
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
                        <label className="block font-sans text-sm font-medium text-nfw-blackberry mb-2">
                          Your message
                        </label>
                        <textarea
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

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-nfw-aubergine text-nfw-dove font-ui text-sm font-black tracking-[0.06em] uppercase hover:bg-nfw-blackberry transition-colors disabled:opacity-60"
                      >
                        {loading ? "Sending..." : "Send Message"}
                      </button>

                      <p className="font-sans text-xs text-nfw-blackberry/40 text-center">
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
            Not a member yet?
          </h2>
          <p className="font-sans text-nfw-blackberry/60 mb-8 text-lg max-w-xl mx-auto">
            Join thousands of women who have already found relief, connection,
            and real support through NFW. It&apos;s free to get started.
          </p>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center justify-center px-10 py-4 bg-nfw-aubergine text-nfw-dove font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-blackberry transition-colors"
          >
            Join for Free
          </Link>
        </div>
      </div>
    </main>
  );
}

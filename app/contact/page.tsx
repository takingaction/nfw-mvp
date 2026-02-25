'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, MessageCircle, Clock, Heart } from 'lucide-react'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simulate submission — wire up to Resend/Supabase later
    await new Promise(r => setTimeout(r, 1000))
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-white">

      {/* HERO */}
      <div className="relative bg-[#2d1239] overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-[#fdf493] rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-[#bcafcf] rounded-full opacity-20 blur-3xl"></div>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#bcafcf]/20 border border-[#bcafcf]/30 rounded-full text-sm mb-6">
            <span className="w-2 h-2 bg-[#d4f1ad] rounded-full"></span>
            <span className="text-[#fffef1] font-semibold">Real people, real responses</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            We&apos;d love to
            <br />
            <span className="text-[#fdf493]">hear from you.</span>
          </h1>
          <p className="text-xl text-[#bcafcf] max-w-2xl mx-auto">
            Whether you have a question, need support, or just want to say hi — we&apos;re here and we&apos;re listening.
          </p>
        </div>
      </div>

      {/* CONTACT SECTION */}
      <div className="relative bg-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-32 h-32 bg-gradient-to-br from-[#fdf493] to-[#d4f1ad] rounded-full opacity-15 blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-40 h-40 bg-gradient-to-br from-[#b2d1ee] to-[#bcafcf] rounded-full opacity-15 blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">

            {/* Left — Info */}
            <div className="space-y-8">
              <div>
                <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-3">Get in touch</p>
                <h2
                  className="text-3xl sm:text-4xl font-black text-[#2d1239] mb-4 leading-tight"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  How can we help?
                </h2>
                <p className="text-lg text-[#2d1239]/70 leading-relaxed">
                  Our team is made up of real women who care deeply about this community. We read every message and do our best to respond within one business day.
                </p>
              </div>

              {/* Contact Cards */}
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-5 rounded-2xl border border-[#2d1239]/10 bg-[#d4f1ad]/20">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#d4f1ad] rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-[#2d1239]" />
                  </div>
                  <div>
                    <p className="font-black text-[#2d1239] mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Email us directly</p>
                    <a href="mailto:michelle@nationalfundforwomen.org" className="text-[#2d1239]/70 hover:text-[#2d1239] transition-colors text-sm underline">
                      michelle@nationalfundforwomen.org
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 rounded-2xl border border-[#2d1239]/10 bg-[#b2d1ee]/20">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#b2d1ee] rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#2d1239]" />
                  </div>
                  <div>
                    <p className="font-black text-[#2d1239] mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Response time</p>
                    <p className="text-[#2d1239]/70 text-sm">We typically respond within one business day. For urgent grant-related questions, please note that in your message.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 rounded-2xl border border-[#2d1239]/10 bg-[#fdf493]/30">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#fdf493] rounded-xl flex items-center justify-center">
                    <Heart className="w-5 h-5 text-[#2d1239]" />
                  </div>
                  <div>
                    <p className="font-black text-[#2d1239] mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>A note from us</p>
                    <p className="text-[#2d1239]/70 text-sm">No question is too small. Whether you need help with your account, have a grant question, or just want to share your story — we want to hear it.</p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-widest mb-4">Looking for something specific?</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Microgrant FAQs', href: '/faq#microgrants' },
                    { label: 'Pricing & Plans', href: '/pricing' },
                    { label: 'Perks & Discounts', href: '/perks/info' },
                    { label: 'Apply for a Grant', href: '/grants/apply' },
                  ].map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="flex items-center gap-2 p-3 rounded-xl border border-[#2d1239]/10 text-sm font-semibold text-[#2d1239] hover:bg-[#bcafcf]/10 hover:border-[#2d1239]/20 transition-all"
                    >
                      <span className="w-1.5 h-1.5 bg-[#bcafcf] rounded-full flex-shrink-0"></span>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Form */}
            <div className="relative">
              <div className="bg-white rounded-3xl border-2 border-[#2d1239]/10 shadow-xl p-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-[#d4f1ad] rounded-full flex items-center justify-center mx-auto mb-6">
                      <MessageCircle className="w-8 h-8 text-[#2d1239]" />
                    </div>
                    <h3
                      className="text-2xl font-black text-[#2d1239] mb-3"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      Message received! 💛
                    </h3>
                    <p className="text-[#2d1239]/60 mb-6">
                      Thank you for reaching out. We&apos;ll get back to you within one business day.
                    </p>
                    <button
                      onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }) }}
                      className="text-sm font-semibold text-[#2d1239] underline hover:text-[#2d1239]/70 transition-colors"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <>
                    <h3
                      className="text-xl font-black text-[#2d1239] mb-6"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      Send us a message
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-[#2d1239] mb-2">Your name</label>
                          <input
                            type="text"
                            required
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="First name"
                            className="w-full px-4 py-3 rounded-xl border border-[#2d1239]/20 text-[#2d1239] placeholder-[#2d1239]/30 focus:outline-none focus:border-[#2d1239] transition-colors text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-[#2d1239] mb-2">Email address</label>
                          <input
                            type="email"
                            required
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            placeholder="you@email.com"
                            className="w-full px-4 py-3 rounded-xl border border-[#2d1239]/20 text-[#2d1239] placeholder-[#2d1239]/30 focus:outline-none focus:border-[#2d1239] transition-colors text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#2d1239] mb-2">What&apos;s this about?</label>
                        <select
                          required
                          value={form.subject}
                          onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-[#2d1239]/20 text-[#2d1239] focus:outline-none focus:border-[#2d1239] transition-colors text-sm bg-white"
                        >
                          <option value="">Select a topic</option>
                          <option value="microgrant">Microgrant question</option>
                          <option value="membership">Membership & billing</option>
                          <option value="perks">Perks & discounts</option>
                          <option value="store">Zero Dollar Store</option>
                          <option value="account">My account</option>
                          <option value="partnership">Partnership inquiry</option>
                          <option value="press">Press & media</option>
                          <option value="other">Something else</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#2d1239] mb-2">Your message</label>
                        <textarea
                          required
                          rows={5}
                          value={form.message}
                          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                          placeholder="Tell us what's on your mind. We're listening."
                          className="w-full px-4 py-3 rounded-xl border border-[#2d1239]/20 text-[#2d1239] placeholder-[#2d1239]/30 focus:outline-none focus:border-[#2d1239] transition-colors text-sm resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[#2d1239] text-[#fffef1] rounded-xl font-bold text-lg hover:bg-[#2d1239]/90 transition-all shadow-lg disabled:opacity-60"
                      >
                        {loading ? 'Sending...' : 'Send Message →'}
                      </button>

                      <p className="text-xs text-[#2d1239]/40 text-center">
                        We never share your information with third parties.
                      </p>
                    </form>
                  </>
                )}
              </div>
              {/* Decorative */}
              <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-[#fdf493] rounded-full opacity-40 -z-10"></div>
              <div className="absolute -top-4 -left-4 w-14 h-14 bg-[#b2d1ee] rounded-full opacity-40 -z-10"></div>
            </div>

          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <div className="bg-[#f8f7fa] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-3xl font-black text-[#2d1239] mb-4"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Not a member yet?
          </h2>
          <p className="text-[#2d1239]/60 mb-8 text-lg max-w-xl mx-auto">
            Join thousands of women who have already found relief, connection, and real support through NFW. It&apos;s free to get started.
          </p>
          <Link
            href="/auth/sign-up"
            className="group relative inline-flex items-center justify-center px-10 py-4 bg-[#2d1239] text-[#fffef1] rounded-xl font-bold text-lg overflow-hidden transition-all shadow-lg hover:bg-[#2d1239]/90"
          >
            Join for Free →
          </Link>
        </div>
      </div>

    </main>
  )
}
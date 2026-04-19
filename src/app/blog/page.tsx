"use client";

import React from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { motion } from "framer-motion";

export default function BlogPage() {
  const posts = [
    {
      title: "Introducing Convos: The Future of Conversational Commerce",
      excerpt: "Today we're excited to launch Convos, a platform that transforms how merchants connect with their customers through AI-powered conversations.",
      author: "Alex Chen",
      date: "January 15, 2026",
      readTime: "5 min read",
      category: "Announcements",
      featured: true,
    },
    {
      title: "How AI is Revolutionizing E-commerce Customer Experience",
      excerpt: "Discover how conversational AI is changing the game for online retailers, from personalized recommendations to seamless checkout experiences.",
      author: "Sarah Kim",
      date: "January 10, 2026",
      readTime: "8 min read",
      category: "Industry Insights",
    },
    {
      title: "5 Ways Voice Commerce Will Shape 2026",
      excerpt: "Voice shopping is no longer a novelty—it's becoming the preferred method for millions of consumers. Here's what merchants need to know.",
      author: "Mike Johnson",
      date: "January 5, 2026",
      readTime: "6 min read",
      category: "Trends",
    },
    {
      title: "Case Study: How Artisan Coffee Increased Conversions by 47%",
      excerpt: "A deep dive into how one specialty coffee brand transformed their online store with conversational commerce.",
      author: "Emma Davis",
      date: "December 20, 2025",
      readTime: "10 min read",
      category: "Case Studies",
    },
    {
      title: "Best Practices for Training Your AI Sales Assistant",
      excerpt: "Learn how to configure and optimize your AI assistant for maximum customer engagement and sales performance.",
      author: "Mike Johnson",
      date: "December 15, 2025",
      readTime: "7 min read",
      category: "Tutorials",
    },
    {
      title: "The Psychology Behind Conversational Shopping",
      excerpt: "Understanding why customers prefer chat-based shopping experiences and how to leverage this in your store.",
      author: "Sarah Kim",
      date: "December 10, 2025",
      readTime: "9 min read",
      category: "Research",
    },
  ];

  const categories = ["All", "Announcements", "Industry Insights", "Trends", "Case Studies", "Tutorials", "Research"];

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/50 px-4 py-2.5 backdrop-blur-xl">
            <Link href="/">
              <Logo size="sm" />
            </Link>
            <Link href="/" className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="h-3 w-3" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Blog</h1>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Insights, tutorials, and updates from the Convos team on conversational commerce and AI.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-2 justify-center mb-10"
          >
            {categories.map((cat, i) => (
              <button
                key={cat}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  i === 0 ? "bg-violet-500/20 text-violet-400 border border-violet-500/30" : "bg-zinc-900 text-zinc-400 border border-white/[0.08] hover:border-white/[0.15]"
                }`}
              >
                {cat}
              </button>
            ))}
          </motion.div>

          {posts[0] && (
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-10"
            >
              <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 p-6 sm:p-8 group">
                <span className="inline-block px-2 py-1 rounded-md bg-violet-500/20 text-violet-400 text-[10px] font-medium mb-3">
                  Featured
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 group-hover:text-violet-300 transition-colors">
                  {posts[0].title}
                </h2>
                <p className="text-zinc-400 mb-4 line-clamp-2">{posts[0].excerpt}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {posts[0].author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {posts[0].date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {posts[0].readTime}
                  </span>
                </div>
              </div>
            </motion.article>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.slice(1).map((post, i) => (
              <motion.article
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                <div className="h-full rounded-xl border border-white/[0.08] bg-zinc-950 p-5 group">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[9px] font-medium mb-3">
                    {post.category}
                  </span>
                  <h3 className="font-semibold text-white mb-2 group-hover:text-violet-300 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-zinc-500 mb-4 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                    <span>{post.author}</span>
                    <span>·</span>
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 text-center"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-8">
              <h2 className="text-xl font-bold mb-2">Subscribe to our newsletter</h2>
              <p className="text-sm text-zinc-400 mb-5">Get the latest articles and updates delivered to your inbox.</p>
              <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-900 border border-white/[0.08] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50"
                />
                <Button type="submit" className="bg-violet-500 hover:bg-violet-600 text-white">
                  Subscribe
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-6">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-zinc-600">© 2026 Convos. All rights reserved.</p>
          <div className="flex gap-4 text-[10px] text-zinc-500">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

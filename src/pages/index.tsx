import { useState } from 'react';
import Header from '../components/Header';
import Head from 'next/head';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import { FiCalendar, FiUser } from 'react-icons/fi';

import { getPrismicClient } from '../services/prismic';
import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

import { symlink } from 'node:fs';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const [nextPage, setNextPage] = useState(postsPagination?.next_page);
  const [otherPost, setOtherPost] = useState([] as Post[]);

  function loadPosts() {
    var myHeaders = new Headers();

    const myInit = {
      method: 'GET',
      headers: myHeaders,
    };

    if (nextPage) {
      fetch(nextPage, myInit)
        .then(response => response.json())
        .then(data => {
          const posts = data.results.map(post => {
            return {
              uid: post.uid,
              first_publication_date: format(
                new Date(post.first_publication_date),
                'dd MMM yyyy',
                { locale: ptBR }
              ),
              data: {
                title: post.data.title,
                subtitle: post.data.subtitle,
                author:post.data.author,
              },
            }
        });
        setOtherPost([...otherPost, ...posts]);
        console.log('console dentro do if', otherPost.length);
        setNextPage(data.next_page);
      });
    }
    }

    console.log(otherPost.length);


  return (
    <>
      <Head>
        <title>Home | spacetraveling</title>
      </Head>
      <Header />
      <main className={styles.homeContainer}>
        <div className={styles.homeContent}>
          {postsPagination?.results.map(post => {
            const formatedDate = format(new Date(post.first_publication_date), 'dd MMM yyyy',
            {locale: ptBR})

            return (
              <Link href={`/post/${post.uid}`} key={post.uid}>
                <a>
                  <h1>{post.data.title}</h1>
                  <p>{post.data.subtitle}</p>
                  <section>
                    <div>
                      <FiCalendar size={'1.25rem'} className={styles.icon} />
                      <time>{formatedDate}</time>
                    </div>
                    <div>
                      <FiUser size={'1.25rem'} className={styles.icon} />
                      <p>{post.data.author}</p>
                    </div>
                  </section>
                </a>
              </Link>
            )
          })}

          {
            otherPost.length > 0 ? (
              otherPost.map(post => (
                <Link href={`/post/${post.uid}`} key={post.uid}>
                  <a>
                    <h1>{post.data.title}</h1>
                    <p>{post.data.subtitle}</p>
                    <section>
                      <div>
                        <FiCalendar size={'1.25rem'} className={styles.icon} />
                        <time>{post.first_publication_date}</time>
                      </div>
                      <div>
                        <FiUser size={'1.25rem'} className={styles.icon} />
                        <p>{post.data.author}</p>
                      </div>
                    </section>
                  </a>
                </Link>
              ))
            ) : (
              <>
              {/* <h1>Carregando</h1> */}
              </>
            )
          }

{
            nextPage ? (
              <button
                onClick={loadPosts}
              >Carregar mais posts</button>
            ) : <></>
          }


        </div>
      </main>
      
    </>
  )
}

export const getStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    fetch: ['post.title', 'post.content'],
    pageSize: 2,
  });

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    }
  });

  console.log(posts);

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results: posts,
      },
    },
    revalidate: 60 * 60 // 1 hour
  }

};

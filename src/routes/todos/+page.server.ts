import { error, invalid, redirect } from "@sveltejs/kit";
import { data } from "@serverless/cloud";
import { v4 as uuid } from "@lukeed/uuid";
import type { PageServerLoad, Actions } from "./$types";

type Todo = {
  uid: string;
  created_at: Date;
  text: string;
  done: boolean;
  pending_delete: boolean;
};

export const load: PageServerLoad = async ({ locals }) => {
  // locals.userid comes from src/hooks.js
  try {
    const response = await data.get<Todo[]>(`todo#${locals.userid}:*`);
    return {
      status: 200,
      todos: response.items.map((item) => item.value),
    };
  } catch (e: any) {
    throw error(500);
  }
};

export const actions: Actions = {
  add: async ({ request, locals }) => {
    const form = await request.formData();
    const text = form.get("text");
    const uid = uuid();

    const todo = {
      uid,
      text,
      done: false,
    };

    await data.set(`todo#${locals.userid}:${uid}`, todo);
    return { status: 200 };
  },
  edit: async ({ request, locals }) => {
    const form = await request.formData();
    const uid = form.get("uid");
    const todo = await data.get<Todo>(`todo#${locals.userid}:${uid}`);
    if (todo) {
      Object.assign(todo, {
        text: form.has("text") ? form.get("text") : todo.text,
        done: form.has("done") ? form.get("done") === "true" : todo.done,
      });

      await data.set(`todo#${locals.userid}:${uid}`, todo);

      return redirect(303, "/todos");
    }

    return invalid(404);
  },
  toggle: async ({ request, locals }) => {
    const form = await request.formData();
    const isDone = !!form.get("done");
    const uid = form.get("uid");
    const todo = await data.get<Todo>(`todo#${locals.userid}:${uid}`);
    if (todo) {
      await data.set<Todo>(`todo#${locals.userid}:${uid}`, {
        done: isDone,
      });
      return { status: 200 };
    }

    return invalid(404);
  },
  delete: async ({ request, locals }) => {
    const form = await request.formData();
    const uid = form.get("uid");

    await data.remove(`todo#${locals.userid}:${uid}`);

    return { status: 200 };
  },
};

import { Model, DBInstance, Orm } from 'trpg/core';

export class ChatEmotionItem extends Model {}

export default function ChatEmotionItemDefinition(
  Sequelize: Orm,
  db: DBInstance
) {
  ChatEmotionItem.init(
    {
      uuid: {
        type: Sequelize.UUID,
        required: true,
        defaultValue: Sequelize.UUIDV1,
      },
      name: {
        type: Sequelize.STRING,
        required: true,
      },
      url: {
        type: Sequelize.STRING,
        required: true,
      },
      width: {
        type: Sequelize.INTEGER,
      },
      height: {
        type: Sequelize.INTEGER,
      },
    },
    { tableName: 'chat_emotion_item', sequelize: db }
  );

  const File = db.models.file_file;
  if (!!File) {
    ChatEmotionItem.belongsTo(File as any, { as: 'file' });
  }

  const User = db.models.player_user as any;
  if (!!User) {
    ChatEmotionItem.belongsTo(User, { as: 'owner' });

    // Usermap
    ChatEmotionItem.belongsToMany(User, {
      through: 'chat_emotion_usermap_item',
      as: 'users',
    });
    User.belongsToMany(ChatEmotionItem, {
      through: 'chat_emotion_usermap_item',
      as: 'emotionItems',
    });
  }

  return ChatEmotionItem;
}
